import { Option } from "types/common";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

export interface LocationDiscoveryWidgetProps {
  className?: string;
  onLocationChange?: (location: Option) => void;
  onSearchSubmit?: (location: Option, searchTerm: string) => void;
}

export interface LocationDropdownProps {
  selectedLocation: Option | null;
  regions: RegionsGroupedByCitiesResponseDTO[];
  onLocationSelect: (location: Option) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
}

export interface GeolocationButtonProps {
  onLocationDetected: (location: Option) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}
