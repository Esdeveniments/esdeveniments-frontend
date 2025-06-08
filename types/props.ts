import { ChangeEvent, MouseEvent, ReactNode } from "react";
import {
  ByDateProps,
  Option,
  PageData,
  PlaceProps,
  PlaceTypeAndLabel,
} from "types/common";
import { EventSummaryResponseDTO } from "types/api/event";

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
  event: EventSummaryResponseDTO;
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

// Removed EventsListProps - no longer needed with server-side architecture

export interface CulturalMessageProps {
  location: string;
}

export interface DescriptionProps {
  description?: string;
  location?: string;
}

export type Href = `/${string}`;

export interface NavigationItem {
  name: string;
  href: Href;
  current: true | false;
}

export interface SocialLinks {
  web: string;
  twitter: string;
  instagram: string;
  telegram: string;
  facebook: string;
  [key: string]: string;
}

export interface DatePickerComponentProps {
  idPrefix?: string;
  startDate: string; // "YYYY-MM-DD" or ISO string
  endDate: string; // "YYYY-MM-DD" or ISO string
  minDate?: string; // "YYYY-MM-DD" or ISO string
  onChange: (field: "startDate" | "endDate", value: string) => void;
  required?: boolean;
  className?: string;
}

export interface CustomHeaderProps {
  date: Date;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
}

export type AcceptedImageTypes =
  | "image/jpeg"
  | "image/png"
  | "image/jpg"
  | "image/webp";

export interface ImageUploaderProps {
  value: string | null;
  onUpload: (file: File) => void;
  progress: number;
}

export interface InputProps {
  id: string;
  title: string;
  subtitle?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export type RadioInputValue = string | number;
export interface RadioInputProps {
  id: string;
  name: string;
  value: RadioInputValue;
  checkedValue: RadioInputValue;
  onChange: (value: RadioInputValue) => void;
  label: string;
  disabled?: boolean;
}

export type RangeInputValue = string | number;
export interface RangeInputProps {
  id: string;
  min: number;
  max: number;
  value: number;
  onChange: (
    e: ChangeEvent<HTMLInputElement> | { target: { value: RangeInputValue } }
  ) => void;
  label: string;
  disabled?: boolean;
}

export interface NoEventsFoundProps {
  title?: string;
}

export interface VideoDisplayProps {
  videoUrl: string | null | undefined;
}

export interface ByDateClientProps extends ByDateProps {
  pageData: PageData;
  placeTypeLabel: PlaceTypeAndLabel;
}

export interface PlaceClientProps extends PlaceProps {
  pageData: PageData;
  placeTypeLabel: PlaceTypeAndLabel;
}

export interface LoadMoreButtonProps {
  place: string;
  category?: string;
  date?: string; // Reserved for future date filtering
  totalServerEvents?: number; // Total number of events from server to determine if more pages exist
}
