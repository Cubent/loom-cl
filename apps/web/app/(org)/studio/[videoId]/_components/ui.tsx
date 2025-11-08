"use client";

import {
	Dialog as KDialog,
	DropdownMenu,
	Polymorphic,
	type PolymorphicProps,
	Slider as KSlider,
	Tooltip as KTooltip,
} from "~/components/kobalte-compat";
import { cva, cx, type VariantProps } from "cva";
import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import Tooltip from "~/components/Tooltip";
import { useEditorContext } from "./context/EditorContext";
import { TextInput } from "./TextInput";

export function Field({
	name,
	icon,
	value,
	className,
	disabled,
	children,
}: {
	name: string;
	icon?: ReactNode;
	value?: ReactNode;
	className?: string;
	disabled?: boolean;
	children?: ReactNode;
}) {
	return (
		<div className={cx("flex flex-col gap-4", className)}>
			<span
				data-disabled={disabled}
				className="flex flex-row items-center gap-[0.375rem] text-gray-12 data-[disabled='true']:text-gray-10 font-medium text-sm"
			>
				{icon}
				{name}
				{value && <div className="ml-auto">{value}</div>}
			</span>
			{children}
		</div>
	);
}

export function Subfield({
	name,
	className,
	required,
	children,
}: {
	name: string;
	className?: string;
	required?: boolean;
	children?: ReactNode;
}) {
	return (
		<div className={cx("flex flex-row justify-between items-center", className)}>
			<span className="font-medium text-gray-12">
				{name}
				{required && <span className="ml-[2px] text-xs text-blue-500">*</span>}
			</span>
			{children}
		</div>
	);
}

export function Slider(
	props: React.ComponentProps<typeof KSlider> & {
		formatTooltip?: string | ((v: number) => string);
	},
) {
	const { projectHistory: history } = useEditorContext();
	const [thumbRef, setThumbRef] = useState<HTMLDivElement | null>(null);
	const [thumbBounds, setThumbBounds] = useState<DOMRect | null>(null);
	const [dragging, setDragging] = useState(false);
	const resumeHistoryRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		if (!thumbRef) return;
		const updateBounds = () => {
			setThumbBounds(thumbRef.getBoundingClientRect());
		};
		updateBounds();
		const resizeObserver = new ResizeObserver(updateBounds);
		resizeObserver.observe(thumbRef);
		return () => resizeObserver.disconnect();
	}, [thumbRef]);

	useEffect(() => {
		if (dragging) {
			const handleMouseUp = () => {
				setDragging(false);
			};
			window.addEventListener("mouseup", handleMouseUp);
			return () => window.removeEventListener("mouseup", handleMouseUp);
		}
	}, [dragging]);

	return (
		<KSlider
			{...props}
			className={cx(
				"relative px-1 h-8 flex flex-row justify-stretch items-center",
				props.className,
			)}
			onChange={(v) => {
				if (!resumeHistoryRef.current) {
					resumeHistoryRef.current = history.pause();
				}
				props.onChange?.(v);
			}}
			onChangeEnd={(e) => {
				resumeHistoryRef.current?.();
				resumeHistoryRef.current = null;
				props.onChangeEnd?.(e);
			}}
		>
			<KSlider.Track
				className="h-[0.3rem] cursor-pointer transition-[height] relative mx-1 bg-gray-4 rounded-full w-full before:content-[''] before:absolute before:inset-0 before:-top-3 before:-bottom-3"
				onPointerDown={() => {
					setDragging(true);
				}}
			>
				<KSlider.Fill className="absolute -ml-2 h-full rounded-full bg-blue-9 ui-disabled:bg-gray-8" />
				<Tooltip
					open={dragging ? true : undefined}
					getAnchorRect={() => {
						return {
							x: thumbBounds?.left,
							y: thumbBounds?.top,
							width: thumbBounds?.width,
							height: thumbBounds?.height,
						};
					}}
					content={
						props.value?.[0] !== undefined
							? typeof props.formatTooltip === "string"
								? `${props.value[0].toFixed(1)}${props.formatTooltip}`
								: props.formatTooltip
									? props.formatTooltip(props.value[0])
									: props.value[0].toFixed(1)
							: undefined
					}
				>
					<KSlider.Thumb
						ref={setThumbRef}
						onPointerDown={() => {
							setDragging(true);
						}}
						onPointerUp={() => {
							setDragging(false);
						}}
						className={cx(
							"bg-gray-1 dark:bg-gray-12 border border-gray-6 shadow-md rounded-full outline-none size-4 -top-[6.3px] ui-disabled:bg-gray-9 after:content-[''] after:absolute after:inset-0 after:-m-3 after:cursor-pointer",
						)}
					/>
				</Tooltip>
			</KSlider.Track>
		</KSlider>
	);
}

export function Input(props: React.ComponentProps<"input">) {
	return (
		<TextInput
			{...props}
			className={cx(
				props.className,
				"rounded-[0.5rem] bg-gray-2 hover:ring-1 py-[18px] hover:ring-gray-5 h-[2rem] font-normal placeholder:text-black-transparent-40 text-xs caret-gray-500 transition-shadow duration-200 focus:ring-offset-1 focus:bg-gray-3 focus:ring-offset-gray-100 focus:ring-1 focus:ring-gray-10 px-[0.5rem] w-full text-[0.875rem] outline-none text-gray-12",
			)}
		/>
	);
}

export const Dialog = {
	Root(
		props: React.ComponentProps<typeof KDialog> & {
			hideOverlay?: boolean;
			size?: "sm" | "lg";
			contentClass?: string;
			children?: ReactNode;
		},
	) {
		return (
			<KDialog {...props}>
				<KDialog.Portal>
					{!props.hideOverlay && (
						<KDialog.Overlay className="fixed inset-0 z-50 bg-[#000]/80 ui-expanded:animate-in ui-expanded:fade-in ui-closed:animate-out ui-closed:fade-out" />
					)}
					<div className="flex fixed inset-0 z-50 justify-center items-center">
						<KDialog.Content
							className={cx(
								props.contentClass,
								"z-50 text-sm rounded-[1.25rem] overflow-hidden border border-gray-3 bg-gray-1 min-w-[22rem] ui-expanded:animate-in ui-expanded:fade-in ui-expanded:zoom-in-95 origin-top ui-closed:animate-out ui-closed:fade-out ui-closed:zoom-out-95",
								(props.size ?? "sm") === "sm" ? "max-w-96" : "max-w-3xl",
							)}
						>
							{props.children}
						</KDialog.Content>
					</div>
				</KDialog.Portal>
			</KDialog>
		);
	},
	CloseButton() {
		return (
			<KDialog.CloseButton as={Button} variant="gray">
				Cancel
			</KDialog.CloseButton>
		);
	},
	ConfirmButton(props: React.ComponentProps<typeof Button>) {
		return <Button variant="primary" {...props} />;
	},
	Footer(
		props: React.ComponentProps<"div"> & {
			close?: ReactNode;
			leftFooterContent?: ReactNode;
			children?: ReactNode;
		},
	) {
		return (
			<div
				className={cx(
					"h-[4rem] px-[1rem] gap-3 flex flex-row items-center",
					props.leftFooterContent ? "justify-between" : "justify-center",
					props.className,
				)}
				{...props}
			>
				{props.leftFooterContent}
				<div className="flex flex-row gap-3 items-center">{props.children}</div>
			</div>
		);
	},
	Header(props: React.ComponentProps<"div">) {
		return (
			<div {...props} className="h-[3.5rem] px-[1rem] flex flex-row items-center" />
		);
	},
	Content(props: React.ComponentProps<"div">) {
		return (
			<div
				{...props}
				className={cx("p-[1rem] flex flex-col border-y border-gray-3", props.className)}
			/>
		);
	},
};

export function DialogContent({
	title,
	confirm,
	className,
	close,
	leftFooterContent,
	children,
}: {
	title: string;
	confirm: ReactNode;
	className?: string;
	close?: ReactNode;
	leftFooterContent?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<>
			<Dialog.Header>
				<KDialog.Title className="text-gray-12">{title}</KDialog.Title>
			</Dialog.Header>
			<Dialog.Content className={className}>{children}</Dialog.Content>
			<Dialog.Footer close={close} leftFooterContent={leftFooterContent}>
				{confirm}
			</Dialog.Footer>
		</>
	);
}

export function MenuItem<T extends React.ElementType = "button">(
	props: PolymorphicProps<T> & { className?: string },
) {
	return (
		<Polymorphic
			{...props}
			className={cx(
				props.className,
				"flex flex-row shrink-0 items-center gap-[0.375rem] px-[0.675rem] py-[0.375rem] rounded-[0.5rem] outline-none text-nowrap overflow-hidden text-ellipsis w-full max-w-full",
				"text-[0.875rem] text-gray-10 disabled:text-gray-10 ui-highlighted:bg-gray-3 ui-highlighted:text-gray-12",
			)}
		/>
	);
}

export function DropdownItem(props: React.ComponentProps<typeof DropdownMenu.Item>) {
	return <MenuItem<typeof DropdownMenu.Item> as={DropdownMenu.Item} {...props} />;
}

export function PopperContent<T extends React.ElementType = "div">(
	props: PolymorphicProps<T> & { className?: string },
) {
	return (
		<Polymorphic {...props} className={cx(dropdownContainerClasses, props.className)} />
	);
}

export function MenuItemList<T extends React.ElementType = "div">(
	props: PolymorphicProps<T> & { className?: string },
) {
	return (
		<Polymorphic
			{...props}
			className={cx(
				props.className,
				"space-y-[0.375rem] p-[0.375rem] overflow-y-auto outline-none",
			)}
		/>
	);
}

const editorButtonStyles = cva(
	[
		"group flex flex-row items-center px-[0.375rem] gap-[0.375rem] h-[2rem] rounded-[0.5rem] text-[0.875rem]",
		"focus:outline focus:outline-2 focus:outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors duration-100",
		"disabled:opacity-50 disabled:text-gray-11",
	],
	{
		variants: {
			variant: {
				primary:
					"text-gray-12 enabled:hover:ui-not-pressed:bg-gray-3 ui-expanded:bg-gray-3 outline-blue-300 focus:bg-transparent",
				danger:
					"text-gray-12 enabled:hover:ui-not-pressed:bg-gray-3 ui-expanded:bg-red-300 ui-pressed:bg-red-300 ui-expanded:text-gray-1 ui-pressed:text-gray-1 outline-red-300",
			},
		},
		defaultVariants: { variant: "primary" },
	},
);

const editorButtonLeftIconStyles = cva("transition-colors duration-100", {
	variants: {
		variant: {
			primary:
				"text-gray-12 enabled:group-hover:not-ui-group-disabled:text-gray-12 ui-group-expanded:text-gray-12",
			danger:
				"text-gray-12 enabled:group-hover:text-gray-12 ui-group-expanded:text-gray-1 ui-group-pressed:text-gray-1",
		},
	},
	defaultVariants: { variant: "primary" },
});

type EditorButtonProps<T extends React.ElementType = "button"> = PolymorphicProps<T> & {
	children?: ReactNode | string;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
	kbd?: string[];
	tooltipText?: string;
	comingSoon?: boolean;
	rightIconEnd?: boolean;
	variant?: "primary" | "danger";
	className?: string;
};

export function EditorButton<T extends React.ElementType = "button">(
	props: EditorButtonProps<T>,
) {
	const {
		children,
		leftIcon,
		rightIcon,
		tooltipText,
		kbd,
		comingSoon,
		rightIconEnd,
		variant = "primary",
		className,
		...others
	} = props;

	const buttonContent = (
		<>
			<span className={editorButtonLeftIconStyles({ variant })}>{leftIcon}</span>
			{children && <span>{children}</span>}
			{rightIcon && (
				<span className={rightIconEnd ? "ml-auto" : ""}>{rightIcon}</span>
			)}
		</>
	);

	if (tooltipText || comingSoon) {
		return (
			<Tooltip
				kbd={kbd}
				content={comingSoon ? "Coming Soon" : tooltipText}
			>
				<Polymorphic
					as="button"
					{...others}
					className={cx(
						editorButtonStyles({ variant, className }),
						rightIconEnd && "justify-between",
					)}
					disabled={comingSoon}
				>
					{buttonContent}
				</Polymorphic>
			</Tooltip>
		);
	}

	return (
		<Polymorphic
			as="button"
			{...others}
			className={cx(
				editorButtonStyles({ variant, className }),
				rightIconEnd && "justify-between",
			)}
		>
			{buttonContent}
		</Polymorphic>
	);
}

export const dropdownContainerClasses =
	"z-10 flex flex-col rounded-[0.75rem] border border-gray-3 bg-gray-1 shadow-s overflow-y-hidden outline-none";

export const topLeftAnimateClasses =
	"ui-expanded:animate-in ui-expanded:fade-in ui-expanded:zoom-in-95 ui-closed:animate-out ui-closed:fade-out ui-closed:zoom-out-95 origin-top-left";

export const topCenterAnimateClasses =
	"ui-expanded:animate-in ui-expanded:fade-in ui-expanded:zoom-in-95 ui-closed:animate-out ui-closed:fade-out ui-closed:zoom-out-95 origin-top-center";

export const topRightAnimateClasses =
	"ui-expanded:animate-in ui-expanded:fade-in ui-expanded:zoom-in-95 ui-closed:animate-out ui-closed:fade-out ui-closed:zoom-out-95 origin-top-right";

export const topSlideAnimateClasses =
	"ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 origin-top-center";

export function ComingSoonTooltip(
	props: React.ComponentProps<typeof KTooltip> & { children?: ReactNode; as?: React.ElementType },
) {
	const { children, as, ...root } = props;
	return (
		<KTooltip placement="top" openDelay={0} closeDelay={0} {...root}>
			<KTooltip.Trigger as={as ?? "div"}>{children}</KTooltip.Trigger>
			<KTooltip.Portal>
				<KTooltip.Content className="p-2 font-medium bg-gray-12 text-gray-1 ui-expanded:animate-in ui-expanded:slide-in-from-bottom-1 ui-expanded:fade-in ui-closed:animate-out ui-closed:slide-out-to-bottom-1 ui-closed:fade-out rounded-lg text-xs z-[1000]">
					Coming Soon
				</KTooltip.Content>
			</KTooltip.Portal>
		</KTooltip>
	);
}

// Web-compatible Button component
const buttonVariants = cva(
	"inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				primary: "bg-blue-9 text-white hover:bg-blue-10 focus-visible:ring-blue-9",
				dark: "bg-gray-12 text-gray-1 hover:bg-gray-11 focus-visible:ring-gray-12",
				gray: "bg-gray-3 text-gray-12 hover:bg-gray-4 focus-visible:ring-gray-3 data-[selected=true]:bg-gray-4",
				danger: "bg-red-9 text-white hover:bg-red-10 focus-visible:ring-red-9",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 px-3 text-xs",
				lg: "h-10 px-6",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "default",
		},
	},
);

export function Button({
	className,
	variant,
	size,
	children,
	onClick,
	disabled,
	autofocus,
	...props
}: {
	className?: string;
	variant?: "primary" | "dark" | "gray" | "danger";
	size?: "default" | "sm" | "lg";
	children?: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	autofocus?: boolean;
	[key: string]: any;
}) {
	return (
		<button
			className={cx(buttonVariants({ variant, size }), className)}
			onClick={onClick}
			disabled={disabled}
			autoFocus={autofocus}
			{...props}
		>
			{children}
		</button>
	);
}
