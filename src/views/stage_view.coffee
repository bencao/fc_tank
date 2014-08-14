class StageView extends View
  init_view: (layer) ->
    @init_bg()
    @init_stage_label()

  init_bg: () ->
    @layer.add(new Kinetic.Rect({
      x     : 0,
      y     : 0,
      fill  : "#999",
      width : 600,
      height: 520
    }))

  init_stage_label: () ->
    # label text
    @stage_label = new Kinetic.Text({
      x: 250,
      y: 230,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "STAGE #{@current_stage}",
      fill: "#333",
    })
    @layer.add(@stage_label)

  update_stage: (current_stage) ->
    @stage_label.setText("STAGE #{current_stage}")
    @layer.draw()
