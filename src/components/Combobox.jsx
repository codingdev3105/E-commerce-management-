import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

function Combobox({
    label,
    options = [],
    value,
    onChange,
    placeholder = "Sélectionner...",
    disabled = false,
    className = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    // Find selected option
    const selectedOption = options.find(o => o.value == value);

    // Sync search term with selected value when not editing
    useEffect(() => {
        if (selectedOption) {
            setSearchTerm(selectedOption.label);
        } else {
            setSearchTerm('');
        }
    }, [value, options]); // Sync when value or options change

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                // Revert to selected value label on blur/close without selection
                if (selectedOption) {
                    setSearchTerm(selectedOption.label);
                } else if (!value) {
                    setSearchTerm('');
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, selectedOption, value]);

    // Filter options
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option) => {
        onChange(option.value);
        setSearchTerm(option.label);
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        if (!isOpen) setIsOpen(true);
        // Optional: clear value if text doesn't match? 
        // For now, we only update parent on actual selection to keep it strict, 
        // or we could let parent decide. 
        // To be safe for Wilaya/Commune, we only trigger onChange on explicit click.
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        setIsOpen(false);
    };

    return (
        <div className={`space-y-1.5 ${className}`} ref={wrapperRef}>
            {label && <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => !disabled && setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed ${disabled ? 'text-slate-500' : 'text-slate-800'}`}
                />

                <div className="absolute right-2 top-2.5 flex items-center gap-1 text-slate-400">
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {isOpen && !disabled && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => handleSelect(option)}
                                    className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-blue-50 hover:text-blue-700 ${option.value == value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
                                >
                                    <span>{option.label}</span>
                                    {option.value == value && <Check className="w-4 h-4" />}
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-sm text-slate-400 text-center italic">
                                Aucune option trouvée
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Combobox;
