import { Namespace, Context } from "@ory/keto-namespace-types"

class User implements Namespace {}

class Folder implements Namespace {
  related: {
    owner: User[]
    editor: User[]
    viewer: User[]
    parent: Folder[]
  }

  permits = {
    view: (ctx: Context): boolean =>
      this.related.viewer.includes(ctx.subject) ||
      this.related.editor.includes(ctx.subject) ||
      this.related.owner.includes(ctx.subject) ||
      this.related.parent.traverse((p) => p.permits.view(ctx)),

    edit: (ctx: Context): boolean =>
      this.related.editor.includes(ctx.subject) ||
      this.related.owner.includes(ctx.subject) ||
      this.related.parent.traverse((p) => p.permits.edit(ctx)),

    delete: (ctx: Context): boolean =>
      this.related.owner.includes(ctx.subject) ||
      this.related.parent.traverse((p) => p.permits.delete(ctx)),
  }
}

class Document implements Namespace {
  related: {
    owner: User[]
    editor: User[]
    viewer: User[]
    parent: Folder[]
  }

  permits = {
    view: (ctx: Context): boolean =>
      this.related.viewer.includes(ctx.subject) ||
      this.related.editor.includes(ctx.subject) ||
      this.related.owner.includes(ctx.subject) ||
      this.related.parent.traverse((p) => p.permits.view(ctx)),

    edit: (ctx: Context): boolean =>
      this.related.editor.includes(ctx.subject) ||
      this.related.owner.includes(ctx.subject) ||
      this.related.parent.traverse((p) => p.permits.edit(ctx)),

    delete: (ctx: Context): boolean =>
      this.related.owner.includes(ctx.subject) ||
      this.related.parent.traverse((p) => p.permits.delete(ctx)),
  }
}
