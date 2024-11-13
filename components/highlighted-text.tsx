interface HighlightedTextProps {
    text: string;
    searchTerms: string[];
}

export function HighlightedText({ text, searchTerms }: HighlightedTextProps) {
    if (!searchTerms.length || !searchTerms[0]) return <span>{text}</span>

    const parts = text.split(new RegExp(`(${searchTerms.join('|')})`, 'gi'))

    return (
        <span>
            {parts.map((part, i) => {
                const isMatch = searchTerms.some(term => 
                    part.toLowerCase().includes(term.toLowerCase())
                )
                
                return isMatch ? (
                    <span key={i} className="bg-yellow-200 dark:bg-yellow-900">
                        {part}
                    </span>
                ) : (
                    <span key={i}>{part}</span>
                )
            })}
        </span>
    )
} 