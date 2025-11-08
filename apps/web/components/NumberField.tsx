"use client";

import { useState, useRef, useEffect, createContext, useContext, type ReactNode } from "react";

interface NumberFieldContextValue {
	value: number;
	handleChange: (value: number) => void;
	minValue?: number;
	maxValue?: number;
	changeOnWheel?: boolean;
	format?: boolean;
}

const NumberFieldContext = createContext<NumberFieldContextValue | null>(null);

interface NumberFieldProps {
	value: number;
	minValue?: number;
	maxValue?: number;
	onRawValueChange?: (value: number) => void;
	changeOnWheel?: boolean;
	format?: boolean;
	children?: ReactNode;
}

export function NumberField({ 
	value, 
	minValue, 
	maxValue, 
	onRawValueChange, 
	changeOnWheel = false,
	format = true,
	children 
}: NumberFieldProps) {
	const [internalValue, setInternalValue] = useState(value);

	useEffect(() => {
		setInternalValue(value);
	}, [value]);

	const handleChange = (newValue: number) => {
		let clampedValue = newValue;
		if (minValue !== undefined) {
			clampedValue = Math.max(clampedValue, minValue);
		}
		if (maxValue !== undefined) {
			clampedValue = Math.min(clampedValue, maxValue);
		}
		setInternalValue(clampedValue);
		onRawValueChange?.(clampedValue);
	};

	return (
		<NumberFieldContext.Provider
			value={{
				value: internalValue,
				handleChange,
				minValue,
				maxValue,
				changeOnWheel,
				format,
			}}
		>
			{children}
		</NumberFieldContext.Provider>
	);
}

interface NumberFieldInputProps extends React.ComponentProps<"input"> {
	className?: string;
}

NumberField.Input = function NumberFieldInput({ className, ...props }: NumberFieldInputProps) {
	const context = useContext(NumberFieldContext);
	const inputRef = useRef<HTMLInputElement>(null);

	if (!context) {
		throw new Error("NumberField.Input must be used within NumberField");
	}

	const { value, handleChange, minValue, maxValue, changeOnWheel, format } = context;

	useEffect(() => {
		if (!changeOnWheel || !inputRef.current) return;

		const handleWheel = (e: WheelEvent) => {
			if (document.activeElement !== inputRef.current) return;
			e.preventDefault();
			const delta = e.deltaY > 0 ? -1 : 1;
			handleChange(value + delta);
		};

		const input = inputRef.current;
		input.addEventListener("wheel", handleWheel, { passive: false });
		return () => input.removeEventListener("wheel", handleWheel);
	}, [value, changeOnWheel, handleChange]);

	return (
		<input
			ref={inputRef}
			type="number"
			value={format ? value : value.toString()}
			onChange={(e) => {
				const numValue = parseFloat(e.target.value) || 0;
				handleChange(numValue);
			}}
			min={minValue}
			max={maxValue}
			className={className}
			{...props}
		/>
	);
};

