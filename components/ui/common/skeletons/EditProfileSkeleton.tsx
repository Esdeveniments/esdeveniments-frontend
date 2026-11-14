const BLOCK = "bg-border/40 animate-pulse";
const FIELD_KEYS = ["displayName", "username"] as const;

// Same column and boxes as EditProfileForm, so the form replaces it in place.
export default function EditProfileSkeleton() {
  return (
    <div className="container py-section-y" aria-hidden="true">
      <div
        className="w-full max-w-xl flex flex-col gap-section-y"
        data-testid="edit-profile-skeleton"
      >
        <div className="flex flex-col gap-element-gap-sm">
          <div className={`h-8 md:h-10 w-2/3 rounded ${BLOCK}`} />
          <div className={`h-6 w-full rounded ${BLOCK}`} />
          <div className={`h-5 w-24 rounded ${BLOCK}`} />
        </div>
        <div>
          <div className={`h-6 w-28 rounded ${BLOCK}`} />
          <div className="mt-2 flex items-center gap-element-gap">
            <div className={`w-20 h-20 shrink-0 rounded-full ${BLOCK}`} />
            <div className={`h-9 w-32 rounded-button ${BLOCK}`} />
          </div>
        </div>
        <div className="flex flex-col gap-section-y-sm">
          {FIELD_KEYS.map((key) => (
            <div key={key}>
              <div className={`h-6 w-1/3 rounded ${BLOCK}`} />
              <div className={`mt-2 h-12 w-full rounded-input ${BLOCK}`} />
            </div>
          ))}
          <div>
            <div className={`h-6 w-1/4 rounded ${BLOCK}`} />
            <div className={`mt-2 h-28 w-full rounded-input ${BLOCK}`} />
          </div>
          <div className={`h-11 w-full sm:w-40 rounded-button ${BLOCK}`} />
        </div>
      </div>
    </div>
  );
}
