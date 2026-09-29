// Friends play: the guest's screen follows the host's by making the same view
// calls on its own copies of the views. These are the calls that change what
// a view shows; everything else (showing and hiding a view) follows the scene.
export const MIRRORED_VIEW_METHODS = {
  stage: ["update_stage"],
  battle_field: [
    "update_enemy_statuses",
    "update_p1_lives",
    "update_p2_lives",
    "update_difficulty",
    "update_stage",
    "update_frame_rate",
    "draw_point_label"
  ],
  report: ["update_hi_score", "update_stage", "show_p2_scores", "update_p1_scores", "update_p2_scores"],
  high_scores: ["show_loading", "show_offline", "show_entries"]
};

// Host side: wraps each mirrored method of the game's views so it also sends
// the call as a "view" message.
export function mirror_views(game, send) {
  for (const [view_name, methods] of Object.entries(MIRRORED_VIEW_METHODS)) {
    const view = game.scenes[view_name]?.view;
    if (!view) {
      continue;
    }
    for (const method of methods) {
      const original = view[method];
      if (typeof original !== "function") {
        continue;
      }
      view[method] = (...args) => {
        send("view", { view: view_name, method, args: args.map(plain) });
        return original.apply(view, args);
      };
    }
  }
}

// A map unit can't cross the wire; where it stands is all a view needs of it.
function plain(arg) {
  if (arg?.area) {
    const { x1, y1, x2, y2 } = arg.area;
    return { area: { x1, y1, x2, y2 } };
  }
  return arg;
}

// Guest side: makes a "view" message's call, if it is one that is mirrored.
export function apply_view_call(game, { view, method, args }) {
  if (!Object.hasOwn(MIRRORED_VIEW_METHODS, view) || !MIRRORED_VIEW_METHODS[view].includes(method)) {
    return;
  }
  if (!Array.isArray(args)) {
    return;
  }
  return game.scenes[view]?.view[method](...args);
}
