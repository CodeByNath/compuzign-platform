/* CompuZign Atomic Engine — Core JS */
(function () {
  "use strict";

  document.addEventListener("click", function (event) {
    const modalOpen = event.target.closest("[data-cz-modal-open]");
    const modalClose = event.target.closest("[data-cz-modal-close]");

    if (modalOpen) {
      const target = document.querySelector(modalOpen.getAttribute("data-cz-modal-open"));
      if (target) target.classList.add("is-active");
    }

    if (modalClose) {
      const target = modalClose.closest(".cz-modal");
      if (target) target.classList.remove("is-active");
    }
  });
})();
