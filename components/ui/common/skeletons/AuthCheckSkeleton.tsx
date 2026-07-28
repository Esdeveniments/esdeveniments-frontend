/**
 * Shown on auth-gated pages (/publica, /perfil/edita) while useAuth()
 * resolves the session. Matches the shared `w-full max-w-md card-bordered
 * card-body stack text-center` card shape used by PublishAuthGate,
 * CompleteProfileGate, and EditProfileAuthGate (an icon circle + heading +
 * description + button) — the three most likely outcomes once the check
 * resolves, and the same shape EditProfileForm uses too. The outer card
 * frame doesn't shift at all when real content swaps in for those three;
 * only PublishForm (no max-w-md — it's a full multi-field form) grows
 * beyond this, which is no different from any other skeleton-to-content
 * transition where the final content is taller than the placeholder.
 */
export default function AuthCheckSkeleton() {
  return (
    <div
      className="container flex-center pt-[6rem] pb-section-y"
      aria-hidden="true"
    >
      <div className="w-full max-w-md card-bordered card-body stack text-center">
        <div className="flex-center">
          <div className="w-14 h-14 rounded-full bg-border/40 animate-pulse" />
        </div>
        <div className="h-6 bg-border/40 rounded w-2/3 mx-auto animate-pulse" />
        <div className="h-4 bg-border/40 rounded w-full animate-pulse" />
        <div className="h-10 bg-border/40 rounded w-full animate-pulse" />
      </div>
    </div>
  );
}
