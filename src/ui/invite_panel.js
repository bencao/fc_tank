// Friends play's invitation: the link under the TV, with a button to copy it
// and - on phones and tablets that can - one to share it straight into a chat.
// The lobby says when there is a link to show (game.on_invite).

const COPY = "COPY LINK";
const COPIED = "COPIED!";

export function install_invite_panel(root, panel, game, {
  clipboard = navigator.clipboard,
  share = navigator.share ? data => navigator.share(data) : null,
  // The panel changes how much room the picture has; let it refit.
  on_resize = () => window.dispatchEvent(new Event("resize"))
} = {}) {
  const link = panel.querySelector("[data-invite-link]");
  const copy = panel.querySelector("[data-invite-copy]");
  const share_button = panel.querySelector("[data-invite-share]");
  let url = null;

  const copy_link = async () => {
    try {
      await clipboard.writeText(url);
      copy.textContent = COPIED;
    } catch {
      // No clipboard for us: select it, so a long-press or Ctrl+C does it.
      link.select();
      copy.textContent = COPY;
    }
  };

  share_button.hidden = !share;
  copy.addEventListener("click", () => copy_link());
  share_button.addEventListener("click", () => {
    share({ title: "FC Tank", text: "Play Battle City with me!", url }).catch(() => {});
  });

  game.on_invite(next => {
    url = next;
    panel.hidden = !url;
    root.dataset.invite = url ? "open" : "";
    link.value = url ?? "";
    copy.textContent = COPY;
    on_resize();
    if (url) {
      clipboard.writeText(url).then(() => { copy.textContent = COPIED; }, () => {});
    }
  });
}
