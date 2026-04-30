import './style.css'
import {createWindow} from "./ui/window.ts";
import TraitsWidget from "./ui/widget/traits.ts";
import OutputWidget from "./ui/widget/output.ts";
import {UIMetrics} from "./ui/metrics.ts";

// Help modal
const help = document.querySelector<HTMLElement>(`#help`)!;
const helpButton = help.querySelector<HTMLElement>(`[data-role="button"]`)!;
const helpWindow = help.querySelector<HTMLElement>(`[data-role="window"]`)!;
const helpInner = help.querySelector<HTMLElement>(`[data-role="inner"]`)!;
const helpContent = help.querySelector<HTMLElement>(`[data-role="content"]`)!;

helpButton.addEventListener("click", () => {
    if (helpWindow.hasAttribute("data-shown")) {
        helpWindow.removeAttribute("data-shown");
    } else {
        helpWindow.setAttribute("data-shown", "1");
    }
});

helpInner.addEventListener("click", () => {
    helpWindow.removeAttribute("data-shown");
});

helpContent.addEventListener("click", (e) => {
    e.stopImmediatePropagation();
});

// Main window
((element: HTMLCanvasElement) => {
    const w = createWindow(element);

    // Create initial widgets
    const w0 = w.addWidget(TraitsWidget);
    const w1 = w.addWidget(OutputWidget);

    if (window.innerWidth >= window.innerHeight) {
        // Automatically fit initial widgets horizontally
        const dim = UIMetrics.VIEWPORT;
        const space = dim - w0.width - w1.width;
        const margin = space / 3;
        w0.x = margin - (dim / 2);
        w0.y = -(w0.height / 2);
        w1.x = (dim / 2) - margin - w1.width;
        w1.y = -(w1.height / 2);
    } else {
        // Automatically fit initial widgets vertically
        const dim = UIMetrics.VIEWPORT;
        const space = dim - w0.height - w1.height;
        const margin = space / 3;
        w0.x = -(w0.width / 2);
        w0.y = margin - (dim / 2);
        w1.x = -(w1.width / 2);
        w1.y = (dim / 2) - margin - w1.height;
    }

    // Start
    w.polling = true;
    w.rendering = true;
})(document.querySelector<HTMLCanvasElement>(`#app`)!);
