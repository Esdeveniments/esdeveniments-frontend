"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Option } from "types/common";
import { LocationDropdownProps } from "types/props";
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon";
import LocationIcon from "@heroicons/react/solid/LocationMarkerIcon";
import { transformRegionsToOptions } from "./utils";

export default function LocationDropdown({
  selectedLocation,
  regions,
  onLocationSelect,
  isLoading = false,
  placeholder = "Cerca ubicacions...",
  className = "",
}: LocationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Transform regions data to flat options
  const allOptions = useMemo(() => {
    return transformRegionsToOptions(regions);
  }, [regions]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return allOptions;

    return allOptions.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allOptions, searchTerm]);

  // Handle dropdown toggle
  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Handle option selection
  const handleSelect = useCallback(
    (option: Option) => {
      onLocationSelect(option);
      setIsOpen(false);
      setSearchTerm("");
    },
    [onLocationSelect],
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div
        className={`flex w-full justify-center rounded-full border border-bColor border-opacity-50 px-component-md py-component-sm ${className}`}
      >
        <div className="animate-pulse text-bColor">Carregant ubicacions...</div>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between rounded-full border border-bColor border-opacity-50 bg-whiteCorp px-component-md py-component-sm transition-colors duration-200 hover:border-primary"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-component-xs">
          <LocationIcon className="h-5 w-5 text-primary" />
          <span className="text-blackCorp">
            {selectedLocation ? selectedLocation.label : placeholder}
          </span>
        </div>
        <ChevronDownIcon
          className={`h-5 w-5 text-blackCorp transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown content */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-component-xs max-h-64 overflow-hidden rounded-lg border border-bColor border-opacity-50 bg-whiteCorp shadow-lg">
          {/* Search input */}
          <div className="border-b border-bColor border-opacity-30 p-component-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Escriu per cercar..."
              className="w-full rounded-md border border-bColor border-opacity-50 px-component-sm py-component-xs focus:border-primary focus:outline-none"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <ul role="listbox" className="py-component-xs">
                {filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    onClick={() => handleSelect(option)}
                    className="flex cursor-pointer items-center gap-component-xs px-component-md py-component-xs text-blackCorp hover:bg-whiteCorp"
                    aria-selected={selectedLocation?.value === option.value}
                  >
                    <LocationIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                    {option.label}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-component-md py-component-sm text-center text-bColor">
                No s&apos;han trobat ubicacions
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
