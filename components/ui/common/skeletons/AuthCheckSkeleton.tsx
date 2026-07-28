/**
 * Shown on auth-gated pages (/publica, /perfil/edita) while useAuth()
 * resolves the session. A neutral spinner rather than a content-shaped
 * skeleton: the real content that follows (a multi-field form, a profile
 * view) varies too much per page to preview accurately, and this check
 * normally resolves in well under a second — a box that gets swapped for a
 * differently-shaped one reads as more of a glitch than a brief, neutral
 * spinner does.
 */
export default function AuthCheckSkeleton() {
  return (
    <div
      className="container flex-center pt-[6rem] pb-section-y"
      role="status"
      aria-label="Loading"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-border" />
    </div>
  );
}
