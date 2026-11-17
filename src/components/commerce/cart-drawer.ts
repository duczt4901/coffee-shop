export function openCartDrawer(event: { preventDefault(): void }) {
    const drawer = document.querySelector<HTMLDialogElement>("#cart-drawer");
    if (!drawer?.showModal) return;
    event.preventDefault();
    delete drawer.dataset.closing;
    drawer.showModal();
}
