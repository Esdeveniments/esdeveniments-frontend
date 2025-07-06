import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActiveLinkProps } from "types/common";

export default function ActiveLink({
  children,
  activeLinkClass,
  className,
  ...props
}: ActiveLinkProps) {
  const pathname = usePathname();
  let classNameProps =
    className ||
    "flex justify-center items-center gap-2 text-blackCorp bg-whiteCorp py-2 px-3 font-barlow italic uppercase font-medium tracking-wider ease-in-out duration-200";

  if (pathname === props.href) {
    classNameProps = `${
      activeLinkClass
        ? activeLinkClass
        : "text-primary bg-whiteCorp border-b-2 border-primary ease-in-out duration-200"
    } ${classNameProps}`;
  }

  return (
    <Link {...props} prefetch={false} className={classNameProps}>
      {children}
    </Link>
  );
}
