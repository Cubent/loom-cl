/**
 * Composes multiple event handlers into a single handler.
 * Each handler is called in sequence, and if any handler calls preventDefault(),
 * subsequent handlers will still be called but the event will be marked as defaultPrevented.
 */
export function composeEventHandlers<T extends HTMLElement>(
	handlers: Array<((event: React.SyntheticEvent<T>) => void) | undefined>,
): (event: React.SyntheticEvent<T>) => void {
	return (event: React.SyntheticEvent<T>) => {
		for (const handler of handlers) {
			if (handler) {
				handler(event);
			}
		}
	};
}

