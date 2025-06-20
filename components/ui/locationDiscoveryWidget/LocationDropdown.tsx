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
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
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
    [onLocationSelect]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
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
        className={`w-full flex justify-center border border-bColor border-opacity-50 rounded-full px-4 py-3 ${className}`}
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
        className="w-full flex justify-between items-center border border-bColor border-opacity-50 rounded-full px-4 py-3 bg-white hover:border-primary transition-colors duration-200"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2">
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-bColor border-opacity-50 rounded-lg shadow-lg z-10 max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-bColor border-opacity-30">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Escriu per cercar..."
              className="w-full px-3 py-2 border border-bColor border-opacity-50 rounded-md focus:outline-none focus:border-primary text-sm"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <ul role="listbox" className="py-1">
                {filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    onClick={() => handleSelect(option)}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-blackCorp flex items-center gap-2"
                    aria-selected={selectedLocation?.value === option.value}
                  >
                    <LocationIcon className="h-4 w-4 text-primary flex-shrink-0" />
                    {option.label}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-bColor text-center">
                No s&apos;han trobat ubicacions
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
