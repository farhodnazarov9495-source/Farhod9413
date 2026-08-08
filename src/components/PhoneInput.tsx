import React, { useRef } from 'react';
import { formatPhoneInput, extractUzbekDigits, isUzbekPhoneValid, getCleanPhone } from '../utils/phoneFormat';

export { isUzbekPhoneValid, formatPhoneInput, getCleanPhone, extractUzbekDigits };

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  className = '',
  onFocus,
  onClick,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = formatPhoneInput(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRaw = e.target.value;
    
    const oldDigits = extractUzbekDigits(value);
    let newDigits = extractUzbekDigits(newRaw);

    // If backspaced over a formatting character (space, hyphen, parenthesis)
    if (newRaw.length < displayValue.length && newDigits.length === oldDigits.length && oldDigits.length > 0) {
      newDigits = oldDigits.slice(0, -1);
    }

    const clean = newDigits.length > 0 ? `+998${newDigits}` : '';
    onChange(clean);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onFocus) onFocus(e);
    setTimeout(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 10);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (onClick) onClick(e);
    if (inputRef.current && inputRef.current.selectionStart && inputRef.current.selectionStart < 5) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onClick={handleClick}
      placeholder="+998(XX) XXX-XX-XX"
      className={className}
      {...props}
    />
  );
};
