import { ImgDefaultProps, Gradient } from "types/common";

/**
 * Balanced gradient palette for fallback images.
 * 
 * Design rationale:
 * - Visible enough to look intentional (not broken)
 * - Muted enough to not compete with real images
 * - Subtle brand hints without being overpowering
 */
const gradients: Gradient[] = [
  // Soft rose/blush (brand nod - muted primary)
  {
    gradient: "linear-gradient(135deg, #F8E8EB, #EDD8DD, #E2C8CF)",
    color: "#EDD8DD",
  },
  {
    gradient: "linear-gradient(135deg, #FAE5E8, #F0D5DA, #E6C5CC)",
    color: "#F0D5DA",
  },
  // Dusty mauve
  {
    gradient: "linear-gradient(135deg, #EDE5E8, #E0D5DA, #D3C5CC)",
    color: "#E0D5DA",
  },
  // Soft blue/slate
  {
    gradient: "linear-gradient(135deg, #E8EDF5, #D8E0F0, #C8D3E8)",
    color: "#D8E0F0",
  },
  {
    gradient: "linear-gradient(135deg, #E5EBF5, #D5DEF0, #C5D1E8)",
    color: "#D5DEF0",
  },
  // Warm sand/beige
  {
    gradient: "linear-gradient(135deg, #F5F0E8, #EBE5D8, #E0D8C8)",
    color: "#EBE5D8",
  },
  // Cool gray with more depth
  {
    gradient: "linear-gradient(135deg, #EAECF0, #D8DCE5, #C6CCD8)",
    color: "#D8DCE5",
  },
  // Sage/muted green (adds variety)
  {
    gradient: "linear-gradient(135deg, #E8F0EB, #D8E5DD, #C8D8CF)",
    color: "#D8E5DD",
  },
];

// Simple hash function to get deterministic gradient selection
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

const ImgDefaultCore: React.FC<ImgDefaultProps> = ({
  title,
  location,
  region,
  date,
}) => {
  // Combine all available props for more unique hash (still deterministic = no layout shift)
  const hashInput = [title, location, region, date].filter(Boolean).join("|") || "default";
  const gradientIndex = hashString(hashInput) % gradients.length;
  const background = gradients[gradientIndex];

  return (
    <div
      className="w-full h-full"
      style={{
        backgroundImage: background.gradient,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100%",
      }}
      role="img"
      aria-label={title || "Imatge no disponible"}
    />
  );
};

export default ImgDefaultCore;
