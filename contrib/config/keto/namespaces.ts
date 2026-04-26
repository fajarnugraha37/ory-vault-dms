import { Namespace, Context } from "@ory/keto-namespace-types"

class User implements Namespace {}

class Division implements Namespace {
  related: {
    members: User[]
    managers: User[]
  }

  permits = {
    view: (ctx: Context): boolean =>
      this.related.members.includes(ctx.subject) ||
      this.related.managers.includes(ctx.subject),
      
    manage: (ctx: Context): boolean =>
      this.related.managers.includes(ctx.subject),
  }
}

class nodes implements Namespace {
  related: {
    owner: User[]
    editor: User[]
    viewer: User[]
    parent: nodes[] // Parent is another node (folder)
    division: Division[]
  }

  permits = {
    view: (ctx: Context): boolean =>
      this.related.viewer.includes(ctx.subject) ||
      this.related.editor.includes(ctx.subject) ||
      this.related.owner.includes(ctx.subject) ||
      this.related.division.traverse((d) => d.permits.view(ctx)) ||
      this.related.parent.traverse((p) => p.permits.view(ctx)),

    edit: (ctx: Context): boolean =>
      this.related.editor.includes(ctx.subject) ||
      this.related.owner.includes(ctx.subject) ||
      this.related.division.traverse((d) => d.permits.manage(ctx)) ||
      this.related.parent.traverse((p) => p.permits.edit(ctx)),

    delete: (ctx: Context): boolean =>
      this.related.owner.includes(ctx.subject) ||
      this.related.division.traverse((d) => d.permits.manage(ctx)) ||
      this.related.parent.traverse((p) => p.permits.delete(ctx)),
  }
}
