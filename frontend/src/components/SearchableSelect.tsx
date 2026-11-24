import React, { useState, useEffect, useRef, useId, useMemo } from 'react';

export interface Option {
    value: string | number;
    label: string;
    [key: string]: any;
}

export interface SearchableSelectProps<T = any> {
    options: T[];
    value?: string | number | null;
    onChange?: (value: string | number | null, selectedOption?: T | null) => void;
    onBlur?: (e?: React.FocusEvent<HTMLInputElement>) => void;
    getOptionValue?: (option: T) => string | number;
    getOptionLabel?: (option: T) => string;
    placeholder?: string;
    disabled?: boolean;
    isInvalid?: boolean;
    errorMessage?: string;
    noOptionsMessage?: string;
    id?: string;
    name?: string;
    className?: string;
    style?: React.CSSProperties;
    clearable?: boolean;
}

function normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

export function SearchableSelect<T = Option>({
    options = [],
    value,
    onChange,
    onBlur,
    getOptionValue = (opt: any) => (typeof opt === 'object' && opt !== null ? opt.value ?? opt.id : opt),
    getOptionLabel = (opt: any) => (typeof opt === 'object' && opt !== null ? opt.label ?? opt.nombre ?? String(opt.value ?? opt.id) : String(opt)),
    placeholder = 'Seleccione una opción...',
    disabled = false,
    isInvalid = false,
    errorMessage,
    noOptionsMessage = 'No se encontraron coincidencias',
    id,
    name,
    className = '',
    style,
    clearable = false,
}: SearchableSelectProps<T>) {
    const generatedId = useId();
    const selectId = id || generatedId;

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const mappedOptions = useMemo(() => {
        return options.map((opt) => ({
            original: opt,
            val: getOptionValue(opt),
            lbl: getOptionLabel(opt),
        }));
    }, [options, getOptionValue, getOptionLabel]);

    const currentSelectedOption = useMemo(() => {
        if (value === undefined || value === null || value === '') return null;
        return mappedOptions.find((opt) => String(opt.val) === String(value)) || null;
    }, [mappedOptions, value]);

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm(currentSelectedOption ? currentSelectedOption.lbl : '');
        }
    }, [currentSelectedOption, isOpen]);

    const filteredOptions = useMemo(() => {
        if (!isOpen) return mappedOptions;
        if (!searchTerm.trim()) return mappedOptions;

        const termNorm = normalizarTexto(searchTerm);
        return mappedOptions.filter((opt) => normalizarTexto(opt.lbl).includes(termNorm));
    }, [mappedOptions, searchTerm, isOpen]);

    useEffect(() => {
        if (isOpen && filteredOptions.length > 0) {
            setHighlightedIndex(0);
        } else {
            setHighlightedIndex(-1);
        }
    }, [filteredOptions, isOpen]);

    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && menuRef.current) {
            const items = menuRef.current.querySelectorAll<HTMLButtonElement>('.searchable-select-item');
            if (items[highlightedIndex]) {
                items[highlightedIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleCloseAndValidate = () => {
        setIsOpen(false);
        const match = mappedOptions.find(
            (opt) => normalizarTexto(opt.lbl) === normalizarTexto(searchTerm)
        );

        if (match) {
            if (String(match.val) !== String(value)) {
                onChange?.(match.val, match.original);
            }
            setSearchTerm(match.lbl);
        } else if (currentSelectedOption) {
            setSearchTerm(currentSelectedOption.lbl);
        } else {
            setSearchTerm('');
            if (value !== null && value !== '' && value !== undefined) {
                onChange?.(null, null);
            }
        }

        if (onBlur) {
            onBlur();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                handleCloseAndValidate();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [currentSelectedOption, searchTerm, mappedOptions, value]);

    const handleInputClickOrFocus = () => {
        if (disabled) return;
        setIsOpen(true);
        if (inputRef.current) {
            inputRef.current.select();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setSearchTerm(text);
        setIsOpen(true);

        const exactMatch = mappedOptions.find(
            (opt) => normalizarTexto(opt.lbl) === normalizarTexto(text)
        );

        if (exactMatch) {
            onChange?.(exactMatch.val, exactMatch.original);
        } else {
            onChange?.(null, null);
        }
    };

    const handleSelectOption = (item: { original: T; val: string | number; lbl: string }) => {
        onChange?.(item.val, item.original);
        setSearchTerm(item.lbl);
        setIsOpen(false);
        if (inputRef.current) {
            inputRef.current.blur();
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange?.(null, null);
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else if (filteredOptions.length > 0) {
                setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else if (filteredOptions.length > 0) {
                setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
            }
        } else if (e.key === 'Enter') {
            if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                e.preventDefault();
                handleSelectOption(filteredOptions[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            if (isOpen) {
                e.preventDefault();
                handleCloseAndValidate();
            }
        } else if (e.key === 'Tab') {
            if (isOpen) {
                handleCloseAndValidate();
            }
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }} className={className}>
            <div style={{ position: 'relative', width: '100%' }}>
                <input
                    ref={inputRef}
                    id={selectId}
                    name={name}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-autocomplete="list"
                    autoComplete="off"
                    value={searchTerm}
                    placeholder={placeholder}
                    disabled={disabled}
                    onClick={handleInputClickOrFocus}
                    onFocus={handleInputClickOrFocus}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        paddingRight: clearable && currentSelectedOption ? '2.5rem' : '2rem',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        color: 'var(--text, #f8fafc)',
                        backgroundColor: 'var(--input-bg, #0d1117)',
                        border: isInvalid ? '1px solid #ef4444' : '1px solid var(--border-color, #30363d)',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />

                <div
                    style={{
                        position: 'absolute',
                        right: clearable && currentSelectedOption ? '2rem' : '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'var(--text-muted, #94a3b8)',
                        fontSize: '0.8rem',
                        zIndex: 4,
                    }}
                >
                    <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
                </div>

                {clearable && currentSelectedOption && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            position: 'absolute',
                            right: '0.6rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted, #94a3b8)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            zIndex: 5,
                            padding: 0,
                        }}
                        title="Limpiar selección"
                    >
                        <i className="bi bi-x-circle-fill"></i>
                    </button>
                )}
            </div>

            {isOpen && !disabled && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '240px',
                        overflowY: 'auto',
                        zIndex: 1050,
                        backgroundColor: '#0d1117',
                        border: '1px solid #30363d',
                        borderRadius: '8px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                        marginTop: '4px',
                        padding: '4px 0',
                    }}
                >
                    {filteredOptions.length === 0 ? (
                        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '10px', fontSize: '0.85rem' }}>
                            {noOptionsMessage}
                        </div>
                    ) : (
                        filteredOptions.map((opt, index) => {
                            const isSelected = currentSelectedOption && String(currentSelectedOption.val) === String(opt.val);
                            const isHighlighted = highlightedIndex === index;

                            return (
                                <button
                                    key={`${opt.val}-${index}`}
                                    type="button"
                                    className="searchable-select-item"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        width: '100%',
                                        padding: '8px 12px',
                                        fontSize: '0.88rem',
                                        textAlign: 'left',
                                        background: isHighlighted ? '#2563eb' : isSelected ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                                        color: isHighlighted ? '#ffffff' : isSelected ? '#60a5fa' : '#f8fafc',
                                        border: 'none',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.12s ease',
                                    }}
                                    onClick={() => handleSelectOption(opt)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    <span>{opt.lbl}</span>
                                    {isSelected && <i className="bi bi-check2" style={{ marginLeft: '8px', color: isHighlighted ? '#ffffff' : '#60a5fa' }}></i>}
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {isInvalid && errorMessage && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                    {errorMessage}
                </div>
            )}
        </div>
    );
}

export default SearchableSelect;
