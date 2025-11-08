"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PresetsStore, Preset, ProjectConfiguration } from "../types";

const PRESETS_STORAGE_KEY = "editor-presets";

async function getPresets(): Promise<PresetsStore> {
	if (typeof window === "undefined") {
		return { presets: [], default: null };
	}
	const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
	if (stored) {
		try {
			return JSON.parse(stored);
		} catch {
			return { presets: [], default: null };
		}
	}
	return { presets: [], default: null };
}

async function setPresets(store: PresetsStore): Promise<void> {
	if (typeof window === "undefined") return;
	localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(store));
}

export type CreatePreset = {
	name: string;
	config: Omit<ProjectConfiguration, "timeline">;
	default: boolean;
};

export function usePresets() {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: ["presets"],
		queryFn: getPresets,
		initialData: { presets: [], default: null },
	});

	const createPreset = useMutation({
		mutationFn: async (preset: CreatePreset) => {
			const current = await getPresets();
			const config = { ...preset.config };
			// Remove timeline and clips from preset
			delete (config as any).timeline;
			delete (config as any).clips;

			const newPreset: Preset = { name: preset.name, config };
			const newStore: PresetsStore = {
				presets: [...current.presets, newPreset],
				default: preset.default ? current.presets.length : current.default,
			};
			await setPresets(newStore);
			return newStore;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["presets"] });
		},
	});

	const deletePreset = useMutation({
		mutationFn: async (index: number) => {
			const current = await getPresets();
			const newPresets = [...current.presets];
			newPresets.splice(index, 1);
			const newDefault =
				index > newPresets.length - 1 ? newPresets.length - 1 : current.default;
			const newStore: PresetsStore = {
				presets: newPresets,
				default: newDefault,
			};
			await setPresets(newStore);
			return newStore;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["presets"] });
		},
	});

	const setDefault = useMutation({
		mutationFn: async (index: number) => {
			const current = await getPresets();
			const newStore: PresetsStore = {
				...current,
				default: index,
			};
			await setPresets(newStore);
			return newStore;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["presets"] });
		},
	});

	const renamePreset = useMutation({
		mutationFn: async ({ index, name }: { index: number; name: string }) => {
			const current = await getPresets();
			const newPresets = [...current.presets];
			newPresets[index] = { ...newPresets[index], name };
			const newStore: PresetsStore = {
				...current,
				presets: newPresets,
			};
			await setPresets(newStore);
			return newStore;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["presets"] });
		},
	});

	return {
		query,
		createPreset: createPreset.mutateAsync,
		deletePreset: deletePreset.mutateAsync,
		setDefault: setDefault.mutateAsync,
		renamePreset: (index: number, name: string) => renamePreset.mutateAsync({ index, name }),
	};
}

