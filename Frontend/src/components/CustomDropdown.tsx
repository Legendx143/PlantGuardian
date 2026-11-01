import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  zIndex?: number;
  searchable?: boolean;
  maxMenuHeight?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  zIndex = 30,
  searchable = false,
  maxMenuHeight = '220px'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = searchable && searchTerm.trim() !== ''
    ? options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  // Single effect on open/close lifecycle
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setHoveredIdx(null);
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Focus search input on open
    if (searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    // Scroll to active selected item ONCE when opening dropdown
    const currIdx = options.findIndex((opt) => opt === value);
    if (currIdx !== -1) {
      setHoveredIdx(currIdx);
      setTimeout(() => {
        if (listContainerRef.current) {
          const items = listContainerRef.current.querySelectorAll('[role="option"]');
          if (items[currIdx]) {
            (items[currIdx] as HTMLElement).scrollIntoView({ block: 'nearest' });
          }
        }
      }, 70);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]); // ONLY depend on isOpen so scroll is NEVER interrupted during user interaction!

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredIdx((prev) => {
          const next = prev === null || prev >= filteredOptions.length - 1 ? 0 : prev + 1;
          if (listContainerRef.current) {
            const items = listContainerRef.current.querySelectorAll('[role="option"]');
            if (items[next]) {
              (items[next] as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredIdx((prev) => {
          const next = prev === null || prev <= 0 ? filteredOptions.length - 1 : prev - 1;
          if (listContainerRef.current) {
            const items = listContainerRef.current.querySelectorAll('[role="option"]');
            if (items[next]) {
              (items[next] as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (hoveredIdx !== null && filteredOptions[hoveredIdx]) {
          onChange(filteredOptions[hoveredIdx]);
          setIsOpen(false);
        }
      }
    }
  };

  const selectedDisplay = options.find((opt) => opt === value) || value || placeholder;

  return (
    <div 
      ref={dropdownRef} 
      onKeyDown={handleKeyDown}
      className={`relative w-full ${className}`}
      style={{ zIndex: isOpen ? zIndex + 50 : zIndex }}
    >
      {/* 100% Solid Compact Non-Transparent Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          backgroundColor: '#0b1a0e',
          color: '#ffffff',
          opacity: 1
        }}
        className="w-full border border-white/25 hover:border-[#c7ea6b] focus:border-[#c7ea6b] focus:ring-2 focus:ring-[#c7ea6b]/50 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center justify-between transition-all cursor-pointer shadow-md text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate pr-2 text-white">
          {selectedDisplay}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-[#c7ea6b] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* 100% Solid Compact Scrollable Options Menu */}
      {isOpen && (
        <div 
          style={{
            backgroundColor: '#071309',
            opacity: 1,
            border: '1.5px solid rgba(199, 234, 107, 0.5)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.98), 0 0 20px rgba(0, 0, 0, 0.9)'
          }}
          className="absolute left-0 right-0 top-full mt-1.5 rounded-xl z-50 animate-fade-in overflow-hidden shadow-2xl"
        >
          {/* Pinned Search Bar at Top */}
          {searchable && (
            <div 
              style={{ backgroundColor: '#071309' }}
              className="p-2 border-b border-white/15"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-white/50 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to filter plant / crop..."
                  style={{
                    backgroundColor: '#020703',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)'
                  }}
                  className="w-full rounded-lg pl-7 pr-2.5 py-1 text-xs placeholder-white/40 outline-none focus:border-[#c7ea6b]"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Smooth Scrollable Options Container */}
          <div
            ref={listContainerRef}
            role="listbox"
            tabIndex={-1}
            style={{
              maxHeight: maxMenuHeight,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
            onWheel={(e) => {
              // Ensure mouse wheel directly scrolls this container without bubbling to parent page
              e.stopPropagation();
            }}
            className="py-1 dropdown-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-white/60 text-center font-medium">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = option === value;
                const isHovered = hoveredIdx === idx;

                let itemBg = '#071309';
                let itemColor = '#ffffff';

                if (isSelected) {
                  itemBg = '#183a1d';
                  itemColor = '#c7ea6b';
                } else if (isHovered) {
                  itemBg = '#112915';
                  itemColor = '#c7ea6b';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    style={{
                      backgroundColor: itemBg,
                      color: itemColor,
                      borderLeft: isSelected ? '3.5px solid #c7ea6b' : '3.5px solid transparent'
                    }}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm text-left flex items-center justify-between transition-colors cursor-pointer font-medium select-none"
                  >
                    <span className="truncate pr-2">{option}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#c7ea6b] shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
