"use client";

import { Collapsible as KCollapsible } from "~/components/kobalte-compat";
import { cx } from "cva";
import { useState } from "react";
import { Field, Slider } from "./ui";
import { ChevronDown } from "lucide-react";

interface Props {
	size: {
		value: number[];
		onChange: (v: number[]) => void;
	};
	opacity: {
		value: number[];
		onChange: (v: number[]) => void;
	};
	blur: {
		value: number[];
		onChange: (v: number[]) => void;
	};
	scrollRef?: HTMLDivElement | null;
}

const ShadowSettings = (props: Props) => {
	const [isOpen, setIsOpen] = useState(false);

	const handleToggle = () => {
		setIsOpen(!isOpen);
		setTimeout(() => {
			if (props.scrollRef) {
				props.scrollRef.scrollTo({
					top: props.scrollRef.scrollHeight,
					behavior: "smooth",
				});
			}
		}, 200);
	};

	return (
		<div className="w-full h-full">
			<button
				type="button"
				onClick={handleToggle}
				className="flex gap-1 items-center w-full font-medium text-left transition duration-200 text-gray-12 hover:text-gray-10"
			>
				<span className="text-sm">Advanced shadow settings</span>
				<ChevronDown
					className={cx(
						"size-5",
						isOpen ? "transition-transform rotate-180" : "",
					)}
				/>
			</button>
			<KCollapsible open={isOpen}>
				<KCollapsible.Content className="overflow-hidden opacity-0 transition-opacity animate-collapsible-up ui-expanded:animate-collapsible-down ui-expanded:opacity-100">
					<div className="mt-4 space-y-6 font-medium">
						<Field name="Size">
							<Slider
								value={props.size.value}
								onChange={props.size.onChange}
								minValue={0}
								maxValue={100}
								step={0.1}
							/>
						</Field>
						<Field name="Opacity">
							<Slider
								value={props.opacity.value}
								onChange={props.opacity.onChange}
								minValue={0}
								maxValue={100}
								step={0.1}
							/>
						</Field>
						<Field name="Blur">
							<Slider
								value={props.blur.value}
								onChange={props.blur.onChange}
								minValue={0}
								maxValue={100}
								step={0.1}
							/>
						</Field>
					</div>
				</KCollapsible.Content>
			</KCollapsible>
		</div>
	);
};

export default ShadowSettings;
