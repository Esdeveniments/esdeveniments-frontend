import { PUBLISH_DRAFT_AUTOSAVE_DELAY_MS } from "./constants";
import { discardPublishDraft, loadPublishDraft, savePublishDraft } from "./publish-draft-storage";
import { preparePublishDraftResume } from "./publish-draft-resume";
import type {
  PublishDraftFlushResult, PublishDraftInput, PublishDraftOwner,
  PublishDraftRevision, PublishDraftSessionState, PublishDraftWriteResult, PublishResumeIntent,
} from "types/publish-draft";

export const initialPublishDraftState: PublishDraftSessionState = {
  status: "loading", pendingDraft: null, failure: null, dirty: false, canDiscard: false,
  guestConflict: false,
};

/** One mounted editor owns its queue; IndexedDB revisions fence other tabs. */
export class PublishDraftSession {
  state = initialPublishDraftState;
  private revision: PublishDraftRevision = null;
  private loaded = false;
  private active = true;
  private generation = 0;
  private version = 0;
  private savedVersion = 0;
  private input: PublishDraftInput | null = null;
  private guestIntent: PublishResumeIntent | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<PublishDraftFlushResult> = Promise.resolve({ ok: true, revision: null });

  constructor(
    private owner: PublishDraftOwner,
    private notify: (state: PublishDraftSessionState) => void,
  ) {}

  private update(patch: Partial<PublishDraftSessionState>) {
    if (!this.active) return;
    this.state = { ...this.state, ...patch };
    this.notify(this.state);
  }

  async load(intent?: PublishResumeIntent) {
    const generation = ++this.generation;
    clearTimeout(this.timer);
    this.loaded = false;
    this.update({ status: "loading", failure: null });
    const prepared = intent ? await preparePublishDraftResume(this.owner, intent) : null;
    if (!this.active || generation !== this.generation) return;
    const handoffFailure = prepared && !prepared.ok ? prepared : null;
    this.guestIntent = intent?.owner.kind === "guest" && handoffFailure &&
      handoffFailure.reason !== "stale" && handoffFailure.reason !== "invalid-input" ? intent : null;
    const result = await loadPublishDraft(this.owner);
    if (!this.active || generation !== this.generation) return;
    if (!result.ok) {
      if ("revision" in result) this.revision = result.revision ?? null;
      if ("revision" in result && result.revision === null) this.guestIntent = null;
      const unreadableAccount = this.guestIntent && "revision" in result &&
        (result.reason === "corrupt" || result.reason === "version");
      this.update({ status: unreadableAccount ? "decision" : "error", failure: result, canDiscard: "revision" in result,
        guestConflict: this.guestIntent !== null });
      return { ...result, resumed: false as const, matchesResume: false as const, guestConflict: this.guestIntent !== null };
    }
    this.loaded = true;
    this.revision = result.revision;
    this.update({
      status: this.guestIntent && handoffFailure?.reason !== "account-conflict" ? "error"
        : result.status === "found" || this.guestIntent ? "decision" : "idle",
      failure: this.guestIntent && handoffFailure?.reason !== "account-conflict" ? handoffFailure : null,
      pendingDraft: result.status === "found" ? result.draft : null,
      canDiscard: result.status === "found",
      guestConflict: this.guestIntent !== null,
    });
    if (result.status !== "found" && this.state.dirty && !this.guestIntent) void this.flush();
    const matchesResume = prepared?.ok === true && result.status === "found" &&
      result.revision === prepared.revision;
    const resumed = matchesResume && !this.state.dirty;
    if (resumed) this.restore();
    return { ...result, resumed, matchesResume, guestConflict: this.guestIntent !== null };
  }

  edit(input: PublishDraftInput) {
    this.input = input;
    this.version++;
    clearTimeout(this.timer);
    this.update({ dirty: true, status: this.state.failure ? "error" : this.state.status });
    if (!this.loaded || this.state.pendingDraft || this.state.failure) return;
    this.update({ status: "saving" });
    this.timer = setTimeout(() => { void this.flush(); }, PUBLISH_DRAFT_AUTOSAVE_DELAY_MS);
  }

  restore() {
    const draft = this.state.pendingDraft;
    if (!draft) return null;
    this.input = draft;
    this.guestIntent = null;
    this.savedVersion = this.version;
    this.update({ status: "saved", pendingDraft: null, dirty: false, guestConflict: false });
    return draft;
  }

  async restoreGuest() {
    const intent = this.guestIntent;
    const { revision, version } = this;
    if (!intent || !revision || this.state.status !== "decision") return null;
    const generation = ++this.generation;
    this.update({ status: "loading", failure: null });
    const prepared = await preparePublishDraftResume(this.owner, intent, revision);
    if (!this.active || generation !== this.generation) return null;
    if (!prepared.ok) {
      const retryable = prepared.reason !== "stale" && prepared.reason !== "invalid-input";
      if (!retryable) this.guestIntent = null;
      this.update({ status: "error", failure: prepared, guestConflict: retryable });
      return null;
    }
    const result = await this.load({ ...intent, owner: this.owner, revision: prepared.revision });
    if (result?.matchesResume && result.status === "found" && version === this.version) {
      return this.restore() ?? result.draft;
    }
    if (result?.ok && !result.matchesResume) {
      this.update({ status: "error", failure: { ok: false, reason: "stale" } });
    }
    return null;
  }

  flush(): Promise<PublishDraftFlushResult> {
    clearTimeout(this.timer);
    if (!this.active || !this.loaded || this.state.pendingDraft || this.state.guestConflict) {
      return Promise.resolve({ ok: false, reason: "unavailable" });
    }
    if (this.state.failure?.reason === "stale") return Promise.resolve(this.state.failure);
    const { input, version, generation } = this;
    this.queue = this.queue.then(async () => {
      if (!this.active || generation !== this.generation) return { ok: false, reason: "stale" };
      if (!input || version <= this.savedVersion) return { ok: true, revision: this.revision };
      // A queued save must not retry over a conflict from the preceding save.
      if (this.state.failure?.reason === "stale") return this.state.failure;
      this.update({ status: "saving", failure: null });
      const result = await savePublishDraft(this.owner, input, this.revision);
      if (result.ok) this.revision = result.revision;
      if (!this.active || generation !== this.generation) return result;
      if (result.ok) {
        this.savedVersion = version;
        this.update({ status: version === this.version ? "saved" : "saving",
          dirty: version !== this.version, canDiscard: true });
      } else {
        this.update({ status: "error", failure: result });
      }
      return result;
    });
    return this.queue;
  }

  async confirmSaved(): Promise<PublishDraftWriteResult> {
    const generation = this.generation;
    const saved = await loadPublishDraft(this.owner);
    if (!this.active || generation !== this.generation) return { ok: false, reason: "stale" };
    if (saved.ok && saved.status === "found" && saved.revision !== null && saved.revision === this.revision) {
      return { ok: true, revision: saved.revision };
    }
    const failure = saved.ok ? { ok: false, reason: "stale" } as const : saved;
    this.update({ status: "error", failure });
    return failure;
  }

  discard() {
    ++this.generation;
    clearTimeout(this.timer);
    this.update({ status: "discarding" });
    this.queue = this.queue.then(async () => {
      if (!this.active) return { ok: false, reason: "stale" };
      const result = await discardPublishDraft(this.owner, this.revision);
      if (result.ok) {
        this.revision = result.revision;
        this.loaded = true;
        this.input = null;
        this.guestIntent = null;
        this.savedVersion = ++this.version;
        this.update({ status: "idle", pendingDraft: null, dirty: false, failure: null, canDiscard: false, guestConflict: false });
      } else {
        this.update({ status: "error", failure: result });
      }
      return result;
    });
    return this.queue;
  }

  async retry() {
    if (this.guestIntent || !this.loaded || this.state.pendingDraft || this.state.failure?.reason === "stale") return this.load(this.guestIntent ?? undefined);
    await this.flush();
    return undefined;
  }

  dispose() {
    this.active = false;
    ++this.generation;
    clearTimeout(this.timer);
  }
}
