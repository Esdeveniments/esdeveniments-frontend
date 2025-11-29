import SectionHeading from "@components/ui/common/SectionHeading";
import type { ListPageFaqProps } from "types/props";

export default function ListPageFaq({
  items,
  title = "Preguntes freqüents",
}: ListPageFaqProps) {
  if (!items || items.length < 2) {
    return null;
  }

  return (
    <section className="container border-t border-border/40 py-section-y">
      <SectionHeading
        title={title}
        titleClassName="heading-2 text-foreground mb-element-gap"
      />
      <dl className="grid gap-element-gap md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.q}
            className="card-bordered p-card-padding-sm md:p-card-padding space-y-3"
          >
            <dt className="heading-4 text-foreground">{item.q}</dt>
            <dd className="body-normal text-foreground/80">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

