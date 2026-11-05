import AuthCheckSkeleton from "@components/ui/common/skeletons/AuthCheckSkeleton";

// Owner-only page: it reads the session before rendering anything.
export default function Loading() {
  return <AuthCheckSkeleton />;
}
