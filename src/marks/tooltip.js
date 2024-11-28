import { getMarkRange } from "../extendMarkRange.js"
import { trimmedRangeFromSelection } from "../utils.js"

export const tooltipMark = {
  attrs: {
    "data-tooltip-text": { default: "" },
    "data-placement": { default: "" },
  },
  parseDOM: [
    {
      tag: "tooltip[data-tooltip-text]",
      getAttrs(dom) {
        return {
          "data-tooltip-text": dom.getAttribute("data-tooltip-text") || "",
          "data-placement": dom.getAttribute("data-placement") || "",
        }
      },
    },
  ],
  toDOM(mark) {
    return [
      "tooltip",
      {
        "data-tooltip-text": mark.attrs["data-tooltip-text"],
        "data-placement": mark.attrs["data-placement"],
      },
    ]
  },
}

const tooltipDialog = () => {
  const { messages } = window.DjangoProseEditor
  return new Promise((resolve) => {
    const div = document.createElement("div")
    div.innerHTML = `
      <dialog class="prose-editor-dialog">
        <form>
          <p>
            <label>${messages.tooltip}</label>
            <input type="text" name="tooltip" size="50" required>
          </p>
          <p>
            <label>${messages.placement}</label>
            <select name="placement" required>
              <option value="top" selected>${messages.top}</option>
              <option value="bottom">${messages.bottom}</option>
              <option value="left">${messages.left}</option>
              <option value="right">${messages.right}</option>
            </select>
          </p>
          <button type="submit">${messages.update}</button>
          <button type="button" value="cancel">${messages.cancel}</button>
        </form>
      </dialog>
    `
    document.body.append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")

    dialog
      .querySelector("button[value=cancel]")
      .addEventListener("click", () => {
        dialog.close()
      })
    dialog.addEventListener("close", () => {
      div.remove()
      resolve(null)
    })
    form.addEventListener("submit", (e) => {
      e.preventDefault()
      if (form.reportValidity()) {
        div.remove()
        resolve({
          tooltip: form.tooltip.value,
          placement: form.placement.value,
        })
      }
    })
    dialog.showModal()
  })
}

export const toggleTooltip = (state, dispatch) => {
  const { $from, empty } = state.selection
  const type = state.schema.marks.tooltip

  // Prüfen, ob das Tooltip-Mark an der aktuellen Cursorposition aktiv ist
  const mark = type.isInSet(state.storedMarks || $from.marks())

  if (mark) {
    // Wenn das Mark aktiv ist, entfernen wir es
    if (dispatch) {
      const range = getMarkRange($from, type)
      if (range) {
        dispatch(
          state.tr.removeMark(range.from, range.to, type).scrollIntoView(),
        )
      }
    }
    return true
  }
  // Wenn das Mark nicht aktiv ist, öffnen wir das Modal, um ein neues Tooltip hinzuzufügen
  if (dispatch) {
    tooltipDialog().then((attrs) => {
      if (attrs) {
        if (empty) {
          // Platzhaltertext einfügen und Mark anwenden
          const text = state.schema.text("Tooltip")
          let tr = state.tr.insert($from.pos, text)
          tr = tr.addMark(
            $from.pos,
            $from.pos + text.nodeSize,
            type.create({
              "data-tooltip-text": attrs.tooltip,
              "data-placement": attrs.placement,
            }),
          )
          dispatch(tr.scrollIntoView())
        } else {
          // Mark auf die Auswahl anwenden
          const { from, to } = trimmedRangeFromSelection(state.selection)
          dispatch(
            state.tr
              .addMark(
                from,
                to,
                type.create({
                  "data-tooltip-text": attrs.tooltip,
                  "data-placement": attrs.placement,
                }),
              )
              .scrollIntoView(),
          )
        }
      }
    })

    return true
  }
}
