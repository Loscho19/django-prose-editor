import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { wrapInList } from "prosemirror-schema-list"
import { Plugin } from "prosemirror-state"
import { openCustomModal } from "./plugins/customButtons.js"

import {
  addLink,
  removeLink,
  updateHTML,
  insertHorizontalRule,
} from "./commands.js"
import { crel, markActive } from "./utils.js"

export function menuPlugin(items) {
  return new Plugin({
    view(editorView) {
      const menuView = new MenuView(editorView, items)
      editorView.dom.parentNode.insertBefore(menuView.dom, editorView.dom)

      return menuView
    },
  })
}

function headingButton(level) {
  const btn = crel("span", {
    className: "prose-menubar__button prose-menubar__button--heading",
  })
  btn.append(
    crel("span", {
      className: "material-icons",
      textContent: "title",
      title: `heading ${level}`,
    }),
    crel("span", { className: "level", textContent: `${level}` }),
  )
  return btn
}

function materialButton(textContent, title) {
  return crel("span", {
    className: "prose-menubar__button material-icons",
    textContent,
    title,
  })
}

export function blockTypeMenuItems(schema, headingLevels) {
  if (!schema.nodes.heading) return []

  const heading = (level) => ({
    command: setBlockType(schema.nodes.heading, { level }),
    dom: headingButton(level),
    active(state) {
      return state.selection.$from.parent.hasMarkup(schema.nodes.heading, {
        level,
      })
    },
  })

  const _levels = headingLevels || [1, 2, 3, 4, 5]

  return [
    ..._levels.map(heading),
    {
      command: setBlockType(schema.nodes.paragraph),
      dom: materialButton("notes", "paragraph"),
      active(state) {
        return state.selection.$from.parent.hasMarkup(schema.nodes.paragraph)
      },
    },
  ]
}

export function listMenuItems(schema) {
  const items = []
  let type
  if ((type = schema.nodes.bullet_list)) {
    items.push({
      command: wrapInList(type),
      dom: materialButton("format_list_bulleted", "unordered list"),
      active(_state) {
        return false
      },
    })
  }
  if ((type = schema.nodes.ordered_list)) {
    items.push({
      command: wrapInList(type),
      dom: materialButton("format_list_numbered", "ordered list"),
      active(_state) {
        return false
      },
    })
  }
  if ((type = schema.nodes.blockquote)) {
    items.push({
      command: wrapIn(type),
      dom: materialButton("format_quote", "blockquote"),
      active(_state) {
        return false
      },
    })
  }
  if ((type = schema.nodes.horizontal_rule)) {
    items.push({
      command: insertHorizontalRule,
      dom: materialButton("horizontal_rule", "horizontal rule"),
      active(_state) {
        return false
      },
    })
  }
  return items
}

export function markMenuItems(schema) {
  const mark = (markType, textContent, title) =>
    markType
      ? {
          command: toggleMark(markType),
          dom: materialButton(textContent, title),
          active: (state) => markActive(state, markType),
        }
      : null

  return [
    mark(schema.marks.strong, "format_bold", "bold"),
    mark(schema.marks.em, "format_italic", "italic"),
    mark(schema.marks.underline, "format_underline", "underline"),
    mark(schema.marks.strikethrough, "format_strikethrough", "strikethrough"),
    mark(schema.marks.sub, "subscript", "subscript"),
    mark(schema.marks.sup, "superscript", "superscript"),
  ].filter(Boolean)
}

export function linkMenuItems(schema) {
  const mark = schema.marks.link
  if (!mark) return []

  return [
    {
      command: addLink,
      dom: materialButton("insert_link", "insert link"),
      active: (state) => markActive(state, mark),
    },
    {
      command: removeLink,
      dom: materialButton("link_off", "remove link"),
      active() {
        return false
      },
    },
  ]
}

export function historyMenuItems() {
  return [
    {
      command: undo,
      dom: materialButton("undo", "undo"),
      active(_state) {
        return false
      },
    },
    {
      command: redo,
      dom: materialButton("redo", "redo"),
      active(_state) {
        return false
      },
    },
  ]
}

export function htmlMenuItem() {
  return [
    {
      command: updateHTML,
      dom: materialButton("code", "edit HTML"),
      active: () => false,
    },
  ]
}

export const customButtonsMenuItems = (buttons) =>
  buttons.map((button) => ({
    command: (state, dispatch) => {
      if (dispatch) {
        if (button.type === "snippet") {
          insertSnippet(state, dispatch, button.content)
        } else if (button.type === "modal") {
          openCustomModal(state, dispatch, button)
        }
      }
      return true
    },
    dom: createCustomButtonDOM(button),
    active: () => false,
  }))

const createCustomButtonDOM = (button) => {
  const dom = crel("span", {
    className: "prose-menubar__button custom-button",
    title: button.name,
  })

  if (button.icon.startsWith("<")) {
    dom.innerHTML = button.icon
  } else {
    dom.className += " material-icons"
    dom.textContent = button.icon
  }

  return dom
}

export const insertSnippet = (state, dispatch, content) => {
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = content.trim()

  const parser = DOMParser.fromSchema(state.schema)
  const node = parser.parse(tempDiv)

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(node))
  }
  return true
}

class MenuView {
  constructor(editorView, itemGroups) {
    this.items = itemGroups.flat()
    this.editorView = editorView

    this.dom = crel("div", { className: "prose-menubar" })

    itemGroups
      .filter((group) => group.length)
      .forEach((group) => {
        const groupDOM = crel("div", { className: "prose-menubar__group" })
        this.dom.append(groupDOM)
        group.forEach(({ dom }) => groupDOM.append(dom))
      })

    this.update()

    this.dom.addEventListener("mousedown", (e) => {
      e.preventDefault()
      editorView.focus()
      this.items.forEach(({ command, dom }) => {
        if (dom.contains(e.target))
          command(editorView.state, editorView.dispatch, editorView)
      })
    })
  }

  update() {
    this.items.forEach(({ command, dom, active }) => {
      // dispatch=null ==> dry run
      const enabled = command(this.editorView.state, null, this.editorView)
      dom.classList.toggle("disabled", !enabled)
      dom.classList.toggle("active", active(this.editorView.state) || false)
    })
  }

  destroy() {
    this.dom.remove()
  }
}
