import { html, render } from "lighterhtml";

type Kind = "frame" | "control";
const NOT_SET = "NOT SET";
export interface NodeData<K> {
  kind: K;
}
export interface ITree<T> {
  id: string;
  data: T;
  children: ITree<T>[] | null;
}
interface ITreeConfig<T> {
  id: string;
  target?: HTMLElement;
  tree: ITree<T>;
}
export class SimpleTreeView<T extends NodeData<K>, K = any> {
  private id: string;
  public tree: ITree<T>;
  private target: HTMLElement | null = null;

  constructor({ id, target, tree }: ITreeConfig<T>) {
    this.id = id;
    this.target = target || null;
    this.tree = tree;
  }

  public render(target?: HTMLElement | null) {
    target 
      && (this.target = target);
    this.target 
      && !(this.target as any).context 
      && ((this.target as any).context = this);

    return this.target && render(this.target, () => html`
    <div id=${this.id} class="tree">
      ${this.tree && renderTreeNodeView(this.tree)}
    </div>
    `);
  }
}

function renderTreeNodeView<T extends NodeData<K>, K = any>(subtree: ITree<T>): HTMLElement {
  let children = subtree.children;
  console.log("render node " + subtree.id)
  let childViews = children && children!.map((c) => {
    return renderTreeNodeView(c);
  });
  return html`
  <div class="treenode">
      <span>${subtree.id}${subtree.data!.kind}</span>
      ${childViews}
  </div>
  `;
}
