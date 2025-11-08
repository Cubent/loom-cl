"use client";

import { cva, cx } from "cva";
import type { ComponentProps } from "react";
import { useState } from "react";

const toggleControlStyles = cva(
	"rounded-full bg-gray-6 ui-disabled:bg-gray-3 ui-checked:bg-blue-500 transition-colors outline-2 outline-offset-2 outline-blue-300",
	{
		variants: {
			size: {
				sm: "w-9 h-[1.25rem] p-[0.125rem]",
				md: "w-11 h-[1.5rem] p-[0.125rem]",
				lg: "w-14 h-[1.75rem] p-[0.1875rem]",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

const toggleThumbStyles = cva(
	"bg-white rounded-full transition-transform ui-checked:translate-x-[calc(100%)]",
	{
		variants: {
			size: {
				sm: "size-[1rem]",
				md: "size-[1.25rem]",
				lg: "size-[1.5rem]",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

export function Toggle(
	props: ComponentProps<"button"> & { 
		size?: "sm" | "md" | "lg";
		checked?: boolean;
		onChange?: (checked: boolean) => void;
		defaultChecked?: boolean;
		disabled?: boolean;
	},
) {
	const { size, className, checked, onChange, defaultChecked, disabled, ...others } = props;
	const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
	const isControlled = checked !== undefined;
	const currentChecked = isControlled ? checked : internalChecked;

	const handleChange = () => {
		if (disabled) return;
		const newChecked = !currentChecked;
		if (!isControlled) {
			setInternalChecked(newChecked);
		}
		onChange?.(newChecked);
	};

	return (
		<button
			{...others}
			type="button"
			role="switch"
			aria-checked={currentChecked}
			data-checked={currentChecked}
			data-disabled={disabled}
			disabled={disabled}
			onClick={handleChange}
			className={cx(className)}
		>
			<input
				type="checkbox"
				checked={currentChecked}
				onChange={handleChange}
				disabled={disabled}
				className="peer sr-only"
				aria-hidden="true"
			/>
			<div className={cx(toggleControlStyles({ size }), currentChecked && "ui-checked", disabled && "ui-disabled")}>
				<div className={cx(toggleThumbStyles({ size }), currentChecked && "ui-checked")} />
			</div>
		</button>
	);
}


