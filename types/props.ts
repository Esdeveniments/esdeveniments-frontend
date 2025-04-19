import { ChangeEvent, MouseEvent, ReactNode } from "react";
import { Option } from "types/common";

export interface SelectComponentProps {
  id: string;
  title: string;
  value?: Option | null;
  onChange: (value: Option | null) => void;
  options?: Option[];
  isDisabled?: boolean;
  isValidNewOption?: boolean;
  isClearable?: boolean;
  placeholder?: string;
}

export interface ViewCounterProps {
  slug: string;
  hideText?: boolean;
}

export interface ReportViewProps {
  slug: string;
}

export interface CardContentProps {
  event: any;
  isPriority?: boolean;
  isHorizontal?: boolean;
}

export interface NativeShareButtonProps {
  title: string;
  url: string;
  date: string;
  location: string;
  subLocation: string;
  onShareClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  hideText?: boolean;
}

export interface ModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  children: ReactNode;
  actionButton?: ReactNode;
  onActionButtonClick?: () => void;
}

export interface TextAreaProps {
  id: string;
  value: string;
  onChange: (e: ChangeEvent<{ name: string; value: string }>) => void;
}

export interface SocialProps {
  links: {
    twitter?: string;
    instagram?: string;
    telegram?: string;
    facebook?: string;
  };
}

export interface EventsListProps {
  events: any[];
  placeTypeLabel?: string;
}
