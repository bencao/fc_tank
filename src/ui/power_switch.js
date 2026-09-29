// The TV's power button, which doubles as the reset: off stops everything
// and darkens the picture, on starts the set afresh.

// power: { off(), on() } - what switching the set off and on does.
// Shows the switch on the page (root's data-power, for styling) and the button.
export function install_power_switch(root, button, power) {
  let on = true;
  const show = () => {
    root.dataset.power = on ? "on" : "off";
    button.setAttribute("aria-pressed", String(on));
  };
  show();

  button.addEventListener("click", () => {
    on = !on;
    show();
    return on ? power.on() : power.off();
  });
}
