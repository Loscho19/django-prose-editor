import { insertSnippet } from "../menu"

export function openCustomModal(state, dispatch, buttonConfig) {
  console.log(state, dispatch, buttonConfig)
  const div = document.createElement("div")
  div.innerHTML = `
    <dialog class="prose-editor-dialog">
      <form>
        ${buttonConfig.fields
          .map(
            (field, id) => `
            <p>
              <label for="input${id}">${field.label}</label>
              ${
                field.type === "textarea"
                  ? `<textarea id="input${id}" name="${field.name}" ${field.required ? "required" : ""}></textarea>`
                  : `<input id="input${id}" type="${field.type}" name="${field.name}" ${field.required ? "required" : ""}>`
              }
            </p>`,
          )
          .join("")}
        <button type="submit">Einfügen</button>
        <button type="button" value="cancel">Abbrechen</button>
      </form>
    </dialog>
    `
  document.body.append(div)
  const dialog = div.querySelector("dialog")
  const form = div.querySelector("form")

  dialog.querySelector("button[value=cancel]").addEventListener("click", () => {
    dialog.close()
  })

  form.addEventListener("submit", (e) => {
    e.preventDefault()
    const data = {}

    for (const field of buttonConfig.fields) {
      let value = form[field.name].value

      if (field.type === "textarea") {
        // Zeilenumbrüche in <br> umwandeln
        value = value.replace(/\n/g, "<br>")
      }

      data[field.name] = value
    }

    const filledTemplate = buttonConfig.template.replace(
      /{(\w+)}/g,
      (_, key) => data[key] || "",
    )
    insertSnippet(state, dispatch, filledTemplate)
    dialog.close()
  })

  dialog.showModal()
}
