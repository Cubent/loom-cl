"use client";

/**
 * Kobalte compatibility layer for React
 * These components provide a React-compatible API that matches Kobalte's API
 * to minimize changes needed when converting from SolidJS to React.
 */

import * as RadixSelect from "@radix-ui/react-select";
import * as RadixDialog from "@radix-ui/react-dialog";
import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import * as RadixSlider from "@radix-ui/react-slider";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { type ReactNode, type ComponentProps, createContext, useContext, useState } from "react";

// Polymorphic helper - just returns the component as-is in React
export function Polymorphic<T extends React.ElementType = "div">(
	props: ComponentProps<T> & { as?: T }
) {
	const { as: Component = "div", ...rest } = props;
	return <Component {...rest} />;
}

export type PolymorphicProps<T extends React.ElementType> = ComponentProps<T> & { as?: T };

// Select compatibility - create wrapper that matches Kobalte's API
const SelectContext = createContext<{ 
	selectedValue: string | undefined;
	options?: any[];
	optionValue?: string | ((option: any) => any);
} | null>(null);

export const Select = Object.assign(
	({ children, value, onValueChange, options, optionValue, optionTextValue, ...props }: ComponentProps<typeof RadixSelect.Root> & {
		value?: string | any;
		onValueChange?: (value: any) => void;
		options?: any[];
		optionValue?: string | ((option: any) => any);
		optionTextValue?: string | ((option: any) => any);
	}) => {
		// Convert value to string if it's an object
		const stringValue = typeof value === "string" 
			? value 
			: value && optionValue 
				? (typeof optionValue === "function" ? optionValue(value) : value[optionValue])
				: undefined;

		const handleValueChange = (newValue: string | undefined) => {
			if (!onValueChange) return;
			if (!options || !optionValue) {
				onValueChange(newValue);
				return;
			}
			// Find the option that matches the string value
			const option = options.find((opt) => {
				const optValue = typeof optionValue === "function" ? optionValue(opt) : opt[optionValue];
				return String(optValue) === String(newValue);
			});
			onValueChange(option ?? newValue);
		};

		return (
			<SelectContext.Provider value={{ 
				selectedValue: stringValue,
				options,
				optionValue,
			}}>
				<RadixSelect.Root value={stringValue} onValueChange={handleValueChange} {...props}>
					{children}
				</RadixSelect.Root>
			</SelectContext.Provider>
		);
	},
	{
		Trigger: RadixSelect.Trigger,
		Value: ({ children, ...props }: ComponentProps<typeof RadixSelect.Value> & {
			children?: ReactNode | ((state: { selectedOption: () => any }) => ReactNode);
		}) => {
			const context = useContext(SelectContext);
			if (typeof children === "function") {
				// Render prop pattern - create a state object that matches Kobalte's API
				const getSelectedOption = () => {
					if (!context?.selectedValue) return undefined;
					if (!context.options || !context.optionValue) {
						return context.selectedValue;
					}
					// Find the option that matches the selected value
					return context.options.find((opt) => {
						const optValue = typeof context.optionValue === "function" 
							? context.optionValue(opt) 
							: opt[context.optionValue as string];
						return String(optValue) === String(context.selectedValue);
					}) ?? context.selectedValue;
				};

				const state = {
					selectedOption: getSelectedOption,
				};
				// Call the render function and pass the result to RadixSelect.Value
				const renderedContent = children(state);
				return (
					<RadixSelect.Value {...props}>
						{renderedContent}
					</RadixSelect.Value>
				);
			}
			return <RadixSelect.Value {...props}>{children}</RadixSelect.Value>;
		},
		Icon: RadixSelect.Icon,
		Portal: RadixSelect.Portal,
		Content: RadixSelect.Content,
		Listbox: RadixSelect.Viewport,
		Item: RadixSelect.Item,
		ItemLabel: RadixSelect.ItemText,
		ItemIndicator: ({ children, ...props }: ComponentProps<"div">) => (
			<div {...props}>{children}</div>
		),
	}
);

// Dialog compatibility - create wrapper that matches Kobalte's API
export const Dialog = Object.assign(
	RadixDialog.Root,
	{
		Trigger: RadixDialog.Trigger,
		Portal: RadixDialog.Portal,
		Overlay: RadixDialog.Overlay,
		Content: RadixDialog.Content,
		Title: RadixDialog.Title,
		Description: RadixDialog.Description,
		Close: RadixDialog.Close,
		CloseButton: RadixDialog.Close,
	}
);

// DropdownMenu compatibility - create wrapper that matches Kobalte's API
export const DropdownMenu = Object.assign(
	RadixDropdownMenu.Root,
	{
		Trigger: RadixDropdownMenu.Trigger,
		Portal: RadixDropdownMenu.Portal,
		Content: RadixDropdownMenu.Content,
		Item: RadixDropdownMenu.Item,
		Group: RadixDropdownMenu.Group,
		Sub: RadixDropdownMenu.Sub,
		SubTrigger: RadixDropdownMenu.SubTrigger,
		SubContent: RadixDropdownMenu.SubContent,
	}
);

// Slider compatibility - create a wrapper that matches Kobalte's API
export const Slider = Object.assign(
	({ children, onChange, onChangeEnd, minValue, maxValue, formatTooltip, ...props }: ComponentProps<typeof RadixSlider.Root> & {
		onChange?: (value: number[]) => void;
		onChangeEnd?: (value: number[]) => void;
		minValue?: number;
		maxValue?: number;
		formatTooltip?: string | ((v: number) => string);
	}) => {
		// Filter out non-DOM props before passing to Radix
		const { minValue: _, maxValue: __, formatTooltip: ___, ...radixProps } = props as any;
		return (
			<RadixSlider.Root
				{...radixProps}
				min={minValue}
				max={maxValue}
				value={props.value as number[]}
				onValueChange={onChange}
				onValueCommit={onChangeEnd}
			>
				{children}
			</RadixSlider.Root>
		);
	},
	{
		Track: RadixSlider.Track,
		Range: RadixSlider.Range,
		Fill: ({ className }: { className?: string }) => (
			<RadixSlider.Range className={className} />
		),
		Thumb: RadixSlider.Thumb,
	}
);

// Tooltip compatibility
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;
export const TooltipPortal = RadixTooltip.Portal;
export const TooltipContent = RadixTooltip.Content;

// Collapsible compatibility - create React implementation
const CollapsibleContext = createContext<{ open: boolean; onOpenChange: (open: boolean) => void } | null>(null);

export const Collapsible = Object.assign(
	({ open, onOpenChange, children, ...props }: ComponentProps<"div"> & {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => {
		const [internalOpen, setInternalOpen] = useState(open ?? false);
		const isControlled = open !== undefined;
		const isOpen = isControlled ? open : internalOpen;
		const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

		return (
			<CollapsibleContext.Provider value={{ open: isOpen, onOpenChange: setIsOpen }}>
				<div data-state={isOpen ? "open" : "closed"} {...props}>
					{children}
				</div>
			</CollapsibleContext.Provider>
		);
	},
	{
		Trigger: ({ children, ...props }: ComponentProps<"button">) => {
			const context = useContext(CollapsibleContext);
			if (!context) throw new Error("Collapsible.Trigger must be used within Collapsible");
			return (
				<button
					{...props}
					onClick={() => context.onOpenChange(!context.open)}
					data-state={context.open ? "open" : "closed"}
				>
					{children}
				</button>
			);
		},
		Content: ({ children, className, ...props }: ComponentProps<"div">) => {
			const context = useContext(CollapsibleContext);
			if (!context) throw new Error("Collapsible.Content must be used within Collapsible");
			if (!context.open) return null;
			return (
				<div className={className} {...props}>
					{children}
				</div>
			);
		},
	}
);

// Tabs compatibility - create React implementation
const TabsContext = createContext<{ value: string | undefined; onValueChange: (value: string | undefined) => void } | null>(null);

export const Tabs = Object.assign(
	({ value, onValueChange, defaultValue, children, ...props }: ComponentProps<"div"> & {
		value?: string;
		onValueChange?: (value: string | undefined) => void;
		defaultValue?: string;
	}) => {
		const [internalValue, setInternalValue] = useState(defaultValue);
		const isControlled = value !== undefined;
		const currentValue = isControlled ? value : internalValue;
		const setValue = isControlled ? onValueChange : setInternalValue;

		return (
			<TabsContext.Provider value={{ value: currentValue, onValueChange: setValue }}>
				<div {...props}>
					{children}
				</div>
			</TabsContext.Provider>
		);
	},
	{
		List: ({ children, ...props }: ComponentProps<"div">) => (
			<div role="tablist" {...props}>
				{children}
			</div>
		),
		Trigger: ({ value, children, ...props }: ComponentProps<"button"> & { value: string }) => {
			const context = useContext(TabsContext);
			if (!context) throw new Error("Tabs.Trigger must be used within Tabs");
			const isSelected = context.value === value;
			return (
				<button
					role="tab"
					aria-selected={isSelected}
					data-selected={isSelected}
					onClick={() => context.onValueChange(value)}
					{...props}
				>
					{children}
				</button>
			);
		},
		Content: ({ value, children, ...props }: ComponentProps<"div"> & { value: string }) => {
			const context = useContext(TabsContext);
			if (!context) throw new Error("Tabs.Content must be used within Tabs");
			if (context.value !== value) return null;
			return (
				<div role="tabpanel" {...props}>
					{children}
				</div>
			);
		},
		Indicator: ({ children }: { children?: ReactNode }) => <>{children}</>,
	}
);

// RadioGroup compatibility - create React implementation
const RadioGroupContext = createContext<{ value: string | undefined; onValueChange: (value: string) => void } | null>(null);

export const RadioGroup = Object.assign(
	({ value, onValueChange, defaultValue, children, ...props }: ComponentProps<"div"> & {
		value?: string;
		onValueChange?: (value: string) => void;
		defaultValue?: string;
	}) => {
		const [internalValue, setInternalValue] = useState(defaultValue);
		const isControlled = value !== undefined;
		const currentValue = isControlled ? value : internalValue;
		const setValue = isControlled ? onValueChange : setInternalValue;

		return (
			<RadioGroupContext.Provider value={{ value: currentValue, onValueChange: setValue }}>
				<div role="radiogroup" {...props}>
					{children}
				</div>
			</RadioGroupContext.Provider>
		);
	},
	{
		Item: ({ value, children, ...props }: ComponentProps<"div"> & { value: string }) => {
			const context = useContext(RadioGroupContext);
			if (!context) throw new Error("RadioGroup.Item must be used within RadioGroup");
			const isChecked = context.value === value;
			return (
				<div role="radio" aria-checked={isChecked} data-checked={isChecked} {...props}>
					{children}
				</div>
			);
		},
		ItemInput: ({ value, ...props }: ComponentProps<"input"> & { value: string }) => {
			const context = useContext(RadioGroupContext);
			if (!context) throw new Error("RadioGroup.ItemInput must be used within RadioGroup");
			return (
				<input
					type="radio"
					value={value}
					checked={context.value === value}
					onChange={() => context.onValueChange(value)}
					{...props}
				/>
			);
		},
		ItemControl: ({ children, ...props }: ComponentProps<"div">) => (
			<div {...props}>{children}</div>
		),
	}
);

// ToggleButton - create a simple implementation
export const ToggleButton = ({ 
	pressed, 
	onPressedChange, 
	children, 
	...props 
}: ComponentProps<"button"> & { 
	pressed?: boolean; 
	onPressedChange?: (pressed: boolean) => void;
}) => {
	return (
		<button
			{...props}
			data-pressed={pressed}
			onClick={() => onPressedChange?.(!pressed)}
		>
			{children}
		</button>
	);
};

