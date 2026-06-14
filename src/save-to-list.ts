const TIMEOUTS = {
    UI_INJECT_DELAY: 1000,
    LAZY_LOAD_WAIT: 2000,
    SCROLL_TO_CLICK: 100,
    POPOVER_MAX_WAIT: 6000,
    POPOVER_POLL: 150,
    LIST_SELECT_POLL: 200,
    POST_LIST_SELECT: 600,
    SUCCESS_VERIFY_POLL: 150,
    DELETE_CLICK_WAIT: 100,
    POST_DELETE_WAIT: 800,
    ITEM_LOOP_END: 300,
    BTN_RESET_DELAY: 5000,
} as const;

const MAX_ITEMS = 1000;

function injectUI(): void {
    if (document.getElementById("amz-list-adder-panel")) return;

    const panel = document.createElement("div");
    panel.id = "amz-list-adder-panel";
    Object.assign(panel.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: "9999",
        backgroundColor: "white",
        padding: "12px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        border: "1px solid #ddd",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        fontFamily: "Arial, sans-serif",
    });

    const label = document.createElement("label");
    Object.assign(label.style, {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        cursor: "pointer",
        color: "#0f1111",
    });

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "amz-delete-chk";

    label.append(checkbox, "Delete from Saved after adding");

    const btn = document.createElement("button");
    btn.id = "amz-list-adder-btn";
    btn.innerText = "Add Saved Items to List";
    Object.assign(btn.style, {
        padding: "10px 16px",
        backgroundColor: "#ffd814",
        color: "#0f1111",
        border: "1px solid #fcd200",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold",
    });

    btn.onmouseover = () => {
        if (!btn.disabled) btn.style.backgroundColor = "#F7CA00";
    };
    btn.onmouseout = () => {
        if (!btn.disabled) btn.style.backgroundColor = "#ffd814";
    };

    btn.addEventListener("click", () => {
        const shouldDelete = checkbox.checked;
        btn.innerText = "Processing...";
        btn.disabled = true;
        btn.style.opacity = "0.7";
        checkbox.disabled = true;

        void startAddingToList(btn, shouldDelete).then(() => {
            checkbox.disabled = false;
        });
    });

    panel.append(label, btn);

    setTimeout(() => document.body.append(panel), TIMEOUTS.UI_INJECT_DELAY);
}

async function startAddingToList(btn: HTMLButtonElement, shouldDelete: boolean): Promise<void> {
    const sleep = (ms: number) => {
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, ms);
        return promise;
    };

    const visible = (el: Element | null): el is Element => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return (
            r.width > 0 &&
            r.height > 0 &&
            cs.visibility !== "hidden" &&
            cs.display !== "none" &&
            cs.opacity !== "0"
        );
    };

    const pickListFromPopover = (pop: Element): boolean => {
        const listRoot = pop.querySelector("#cldd-dropdown-lists");
        if (!listRoot) return false;

        const target =
            listRoot.querySelector<HTMLAnchorElement>("a.cldd-list-option-default") ??
            listRoot.querySelector<HTMLAnchorElement>("a.a-dropdown-link");

        if (target) {
            target.click();
            return true;
        }
        return false;
    };

    const getItemId = (item: Element): string =>
        item.getAttribute("data-itemid") ??
        item.getAttribute("data-asin") ??
        item.querySelector<HTMLInputElement>('input[name^="submit.delete-saved."]')?.name ??
        (item as HTMLElement).innerText.substring(0, 30);

    let successCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;
    const processedIds = new Set<string>();

    const SAVED_SELECTOR =
        "#sc-saved-cart, #sc-saved-items, [data-section='saved-for-later'], [data-saved-items-list='true']";

    console.group("Starting Amazon Auto-Adder...");

    while (processedIds.size < MAX_ITEMS) {
        const saved = document.querySelector(SAVED_SELECTOR) ?? document.body;

        const visibleItemsIter = Iterator.from(
            saved.querySelectorAll(".sc-list-item-content")
        ).filter(visible);
        const currentItems = visibleItemsIter.toArray();
        const item = currentItems.find((it) => !processedIds.has(getItemId(it)));

        if (!item) {
            console.log("No more unprocessed items visible. Scrolling to trigger lazy-load...");
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(TIMEOUTS.LAZY_LOAD_WAIT);

            const retrySaved = document.querySelector(SAVED_SELECTOR) ?? document.body;

            // Evaluates DOM list lazily, stopping iteration once the `.find()` condition is met
            const nextItem = Iterator.from(retrySaved.querySelectorAll(".sc-list-item-content"))
                .filter(visible)
                .find((it) => !processedIds.has(getItemId(it)));

            if (!nextItem) {
                console.log("Finished. All items cleared or no more items loaded after scrolling.");
                break;
            } else {
                console.log("New items loaded. Resuming...");
                continue;
            }
        }

        const itemId = getItemId(item);
        processedIds.add(itemId);

        console.group(`Item: ${itemId}`);
        btn.innerText = `Processing... (${successCount + skippedCount}/${currentItems.length})`;

        try {
            const successLabel = item.querySelector(".add-to-list-success-label");
            if (successLabel && !successLabel.classList.contains("aok-hidden")) {
                console.info("Item already added to list. Skipping...");
                skippedCount += 1;
                continue;
            }

            const addTrigger = item.querySelector<HTMLInputElement>(
                'span[data-action="add-to-list-popover"] input[name^="submit.add-to-list-popover"]'
            );

            if (!addTrigger) {
                console.warn("Add-to-list button not found for this item.");
                continue;
            }

            addTrigger.scrollIntoView({ block: "center" });
            await sleep(TIMEOUTS.SCROLL_TO_CLICK);
            addTrigger.click();

            let popoverNode: Element | null = null;
            let isSuccess = false;
            const startWait = Date.now();

            while (Date.now() - startWait < TIMEOUTS.POPOVER_MAX_WAIT) {
                if (!document.body.contains(item)) {
                    console.info("Amazon AJAX refresh detected (item detached). Assuming success.");
                    isSuccess = true;
                    break;
                }

                const lab = item.querySelector(".add-to-list-success-label");
                if (lab && !lab.classList.contains("aok-hidden")) {
                    isSuccess = true;
                    break;
                }

                const pop = document.querySelector("#cldd-popover-inner.a-dropdown");
                if (pop && visible(pop)) {
                    popoverNode = pop;
                    break;
                }

                await sleep(TIMEOUTS.POPOVER_POLL);
            }

            if (isSuccess) {
                console.debug("Item automatically added (popover bypassed).");
            } else if (popoverNode) {
                let clicked = false;
                for (let i = 0; i < 10; i++) {
                    clicked = pickListFromPopover(popoverNode);
                    if (clicked) break;
                    await sleep(TIMEOUTS.LIST_SELECT_POLL);
                }

                if (!clicked) console.warn("No list option found inside popover.");
                await sleep(TIMEOUTS.POST_LIST_SELECT);

                if (visible(popoverNode)) {
                    const closeBtn = popoverNode.querySelector<HTMLButtonElement>(
                        'button[data-action="a-popover-close"], .a-button-close, .a-close-button'
                    );
                    closeBtn?.click();
                }

                for (let i = 0; i < 30; i++) {
                    if (!document.body.contains(item)) {
                        isSuccess = true;
                        break;
                    }
                    const lab = item.querySelector(".add-to-list-success-label");
                    if (lab && !lab.classList.contains("aok-hidden")) {
                        isSuccess = true;
                        break;
                    }
                    await sleep(TIMEOUTS.SUCCESS_VERIFY_POLL);
                }
            } else {
                console.warn("Timed out waiting for popover or success label.");
            }

            if (isSuccess) {
                successCount += 1;
                console.info("Added to list successfully.");

                if (shouldDelete) {
                    let targetForDelete: Element | null = item;

                    if (!document.body.contains(item)) {
                        const freshContainer =
                            document.querySelector(
                                "#sc-saved-cart, #sc-saved-items, [data-section='saved-for-later']"
                            ) ?? document.body;

                        targetForDelete =
                            Iterator.from(
                                freshContainer.querySelectorAll(".sc-list-item-content")
                            ).find((it) => getItemId(it) === itemId) ?? null;
                    }

                    if (targetForDelete) {
                        const deleteBtn =
                            targetForDelete.querySelector<HTMLInputElement>(
                                'input[name^="submit.delete-saved."][data-action="delete-saved"]'
                            ) ??
                            targetForDelete.querySelector<HTMLInputElement>(
                                '[data-action="delete-saved"] input[type="submit"]'
                            ) ??
                            targetForDelete.querySelector<HTMLInputElement>(
                                'span[data-action="delete-saved"] input[type="submit"]'
                            );

                        if (deleteBtn) {
                            deleteBtn.scrollIntoView({ block: "center" });
                            await sleep(TIMEOUTS.DELETE_CLICK_WAIT);
                            deleteBtn.click();
                            deletedCount += 1;
                            console.info("Deleted from Saved for later.");
                            await sleep(TIMEOUTS.POST_DELETE_WAIT);
                        } else {
                            console.warn("Delete control not found.");
                        }
                    }
                }
            } else {
                console.warn("Failed to confirm success. The add might still have worked.");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn("Error processing item:", message);
        } finally {
            console.groupEnd();
            await sleep(TIMEOUTS.ITEM_LOOP_END);
        }
    }

    console.groupEnd();
    console.log(
        `Done. Added: ${successCount} | Skipped: ${skippedCount} | Deleted: ${deletedCount}`
    );

    btn.innerText = `Done! (${successCount} added, ${deletedCount} deleted)`;
    Object.assign(btn.style, {
        backgroundColor: "#4caf50",
        color: "white",
        borderColor: "#45a049",
    });

    setTimeout(() => {
        btn.innerText = "Add Saved Items to List";
        Object.assign(btn.style, {
            backgroundColor: "#ffd814",
            color: "#0f1111",
            borderColor: "#fcd200",
            opacity: "1",
        });
        btn.disabled = false;
    }, TIMEOUTS.BTN_RESET_DELAY);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectUI);
} else {
    injectUI();
}
