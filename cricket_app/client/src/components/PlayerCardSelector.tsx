interface PlayerCardSelectorProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    getOptionLabel?: (value: string) => string;
    disabledOptions?: string[];
    includeNoneOption?: boolean;
    noneOptionLabel?: string;
    listClassName?: string;
}

export default function PlayerCardSelector({
    options,
    value,
    onChange,
    ariaLabel,
    getOptionLabel,
    disabledOptions = [],
    includeNoneOption = false,
    noneOptionLabel = 'None',
    listClassName = ''
}: PlayerCardSelectorProps) {
    const disabledSet = new Set(disabledOptions);

    return (
        <div className={`ms-player-card-list ${listClassName}`.trim()} role="listbox" aria-label={ariaLabel}>
            {includeNoneOption && (
                <button
                    type="button"
                    className={`ms-player-card ${!value ? 'is-selected' : ''}`}
                    aria-selected={!value}
                    onClick={() => onChange('')}
                >
                    {noneOptionLabel}
                </button>
            )}

            {options.map((option) => {
                const isSelected = value === option;
                const isDisabled = disabledSet.has(option);

                return (
                    <button
                        key={option}
                        type="button"
                        className={`ms-player-card ${isSelected ? 'is-selected' : ''}`}
                        disabled={isDisabled}
                        aria-selected={isSelected}
                        onClick={() => onChange(option)}
                    >
                        {getOptionLabel ? getOptionLabel(option) : option}
                    </button>
                );
            })}
        </div>
    );
}
