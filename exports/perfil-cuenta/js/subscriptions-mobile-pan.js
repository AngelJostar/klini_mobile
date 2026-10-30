(function () {
    "use strict";

    var interactiveSelector = "button, a, [role='button']";
    var scheduled = false;

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function isPlanAction(element) {
        var text = normalize(element.textContent);
        return text === "elegir plan" || text === "plan activo" || text === "seleccionar plan";
    }

    function findPlanCard(action, boundary) {
        var current = action.parentElement;

        while (current && current !== boundary) {
            var text = normalize(current.innerText);
            var actions = Array.prototype.filter.call(
                current.querySelectorAll(interactiveSelector),
                isPlanAction
            );

            if (actions.length === 1 && (text.indexOf("$") !== -1 || text.indexOf("gratis") !== -1)) {
                return current;
            }

            current = current.parentElement;
        }

        return action.parentElement;
    }

    function commonParent(elements, boundary) {
        var current = elements[0] && elements[0].parentElement;

        while (current && current !== boundary.parentElement) {
            var containsAll = elements.every(function (element) {
                return current.contains(element);
            });

            if (containsAll) {
                return current;
            }

            current = current.parentElement;
        }

        return null;
    }

    function enablePointerPan(track) {
        if (track.dataset.drsamPanReady === "true") {
            return;
        }

        track.dataset.drsamPanReady = "true";

        var dragging = false;
        var moved = false;
        var startX = 0;
        var startScroll = 0;
        var frame = 0;
        var targetScroll = 0;

        track.addEventListener("pointerdown", function (event) {
            if (event.pointerType === "touch" || event.button !== 0) {
                return;
            }

            dragging = true;
            moved = false;
            startX = event.clientX;
            startScroll = track.scrollLeft;
            targetScroll = startScroll;
            track.classList.add("is-dragging");
            track.setPointerCapture(event.pointerId);
        });

        track.addEventListener("pointermove", function (event) {
            if (!dragging) {
                return;
            }

            var distance = event.clientX - startX;
            moved = moved || Math.abs(distance) > 4;
            targetScroll = startScroll - distance;

            if (!frame) {
                frame = window.requestAnimationFrame(function () {
                    track.scrollLeft = targetScroll;
                    frame = 0;
                });
            }
        });

        function finish(event) {
            if (!dragging) {
                return;
            }

            dragging = false;
            track.classList.remove("is-dragging");

            if (track.hasPointerCapture && track.hasPointerCapture(event.pointerId)) {
                track.releasePointerCapture(event.pointerId);
            }
        }

        track.addEventListener("pointerup", finish);
        track.addEventListener("pointercancel", finish);
        track.addEventListener("lostpointercapture", function () {
            dragging = false;
            track.classList.remove("is-dragging");
        });

        track.addEventListener("click", function (event) {
            if (moved) {
                event.preventDefault();
                event.stopPropagation();
                moved = false;
            }
        }, true);
    }

    function enhanceSubscriptions() {
        var actions = Array.prototype.filter.call(
            document.querySelectorAll(interactiveSelector),
            isPlanAction
        );

        if (actions.length < 2) {
            return;
        }

        var title = Array.prototype.find.call(document.querySelectorAll("h1, h2, h3, h4, strong"), function (element) {
            return normalize(element.textContent).indexOf("suscripciones") !== -1;
        });

        var boundary = title
            ? title.closest("[role='dialog'], section, article, main, .modal, .drawer, .panel") || document.body
            : actions[0].closest("[role='dialog'], section, article, main, .modal, .drawer, .panel") || document.body;

        var cards = actions.map(function (action) {
            return findPlanCard(action, boundary);
        }).filter(function (card, index, list) {
            return card && list.indexOf(card) === index;
        });

        if (cards.length < 2) {
            return;
        }

        var track = cards.every(function (card) {
            return card.parentElement === cards[0].parentElement;
        }) ? cards[0].parentElement : commonParent(cards, boundary);

        if (!track) {
            return;
        }

        boundary.classList.add("drsam-subscriptions-mobile");
        track.classList.add("drsam-subscriptions-pan");
        cards.forEach(function (card) {
            card.classList.add("drsam-subscription-card");
        });
        enablePointerPan(track);
    }

    function scheduleEnhancement() {
        if (scheduled) {
            return;
        }

        scheduled = true;
        window.requestAnimationFrame(function () {
            scheduled = false;
            enhanceSubscriptions();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", scheduleEnhancement);
    } else {
        scheduleEnhancement();
    }

    new MutationObserver(scheduleEnhancement).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}());
