/// <reference path="../node_modules/goodcore/goodcore_global.iife.d.ts" />

const debounce = Util.debounce;
const contains = Dom.contains;
const get = Dom.get;
const find = Dom.find;
const findAll = Dom.findAll;
const findParent = Dom.findParent;
const is = Dom.is

/*
 * TODO: Control + arrow to drag with arrows.
 */

type TCollapseState = "off" | "collapsed" | "expanded";
interface ITreeConfig<T> {
  id: string;
  target?: HTMLElement;
  tree?: Tree<T>;
  renderer?: (node: Tree<T>, childViews: Tag<HTMLElement>[] | null) => Tag<HTMLElement>;
  onclick?: (subtree: Tree<T>, event: MouseEvent | TouchEvent) => boolean | void;
  onpress?: (subtree: Tree<T>, event: MouseEvent | TouchEvent) => boolean | void;
  ondrop?: (subtree: Tree<T>, event: DragEvent) => boolean | void;
  onfocus?: (subtree: Tree<T>, event?: FocusEvent) => boolean | void;
  isContainer?: (subtree: Tree<T>) => boolean;
  getCollapseState?: (subtree: Tree<T>) => TCollapseState;
  setCollapseState?: (subtree: Tree<T>, value: TCollapseState) => void;
}

export class TreeView<T> {
  private id: string;
  public tree: Tree<T> | null = null;
  private activeSubTree: Tree<T> | null = null;
  private renderTarget: HTMLElement | null = null;
  private renderer: ((node: Tree<T>, childViews: Tag<HTMLElement>[] | null) => Tag<HTMLElement>);
  private dragElement?: HTMLElement;
  private dragSubTree?: Tree<T>; 
  private isClickable: boolean = false;
  private isPressable: boolean = false;
  private isDraggable: boolean = false;
  private isContainer: (subtree: Tree<T>) => boolean = (subtree: Tree<T>) => true;
  private isCollapsed: (subtree: Tree<T>) => boolean = (subtree: Tree<T>) => this.getCollapseState(subtree) === "collapsed";
  private getCollapseState: (subtree: Tree<T>) => TCollapseState = (subtree: Tree<T>) => "off";
  private setCollapseState: (subtree: Tree<T>, value: TCollapseState) => void = (subtree: Tree<T>, value: TCollapseState) => subtree.set({collapsed: value} as any);
  private selected: Tree<T> | null = null;

  constructor({ id, target, tree, renderer, onclick, onpress, ondrop, onfocus, isContainer, getCollapseState, setCollapseState }: ITreeConfig<T>) {
    this.id = id;
    this.renderTarget = target ?? null;
    this.tree = tree ?? null;
    this._onclick = onclick ?? null;
    this._onpress = onpress ?? null;
    this._ondrop = ondrop ?? null;
    this._onfocus = onfocus ?? null;
    this.isClickable = !!onclick;
    this.isPressable = !!onpress;
    this.isDraggable = !!ondrop;
    this.isContainer = isContainer ?? this.isContainer;
    this.getCollapseState = getCollapseState ?? this.getCollapseState;
    this.setCollapseState = setCollapseState ?? this.setCollapseState;

    this.renderer =
      ((subtree: Tree<T>, childViews: Tag<HTMLElement>[] | null) => lighterhtml.html`
      <div data-id=${subtree.id} class=${["treenode", (this.isContainer(subtree) ? "dropzone" : "nodrop"),
      (childViews ? "haschildren" : "nochildren"), 
      (!this.isContainer(subtree) 
        ? "auto" 
        : this.getCollapseState(subtree) === "off" 
          ? "auto" 
          : subtree.childCount > 0 
            ? this.isCollapsed(subtree) 
              ? "collapsed" 
              : "expanded" 
            : "auto")].join(" ")} id="${this.id + "_" + subtree.id}"
        draggable="true" 
        ondragstart=${this.isDraggable ? (event: DragEvent) => this.ondragstart(subtree, event) : null} 
        tabindex="0" 
        onfocus=${(event: DragEvent) => this.setActive(subtree, event)}
      >
        <div class="${["innernode", (childViews ? "haschildren" : "nochildren")].join(" ")}" 
          onclick=${this.isClickable ? this.onclick!.bind(this, subtree) : null}
          oncontextmenu=${this.isPressable ? this.onclick!.bind(this, subtree) : null}
        >
          ${renderer ? renderer(subtree, childViews) : subtree.id}
          ${renderer ? null : childViews}
        </div>
      </div>
      `);
    this.tree?.on("change", debounce(() => this.render()));
  }
  public render(target?: HTMLElement | null) {
    let result: any;
    this.renderTarget = target ?? this.renderTarget;
    if (this.renderTarget) {

      result = lighterhtml.render(this.renderTarget, () => lighterhtml.html`
      <div id=${this.id} class="tree"
        ondragenter=${(event: DragEvent) => this.ondragenter(event)} 
        ondragover=${(event: DragEvent) => this.ondragover(event)} 
        ondragleave=${(event: DragEvent) => this.ondragleave(event)} 
        ondragend=${(event: DragEvent) => this.ondragend(event)} 
        ondrop=${(event: DragEvent) => this.dragSubTree && this.ondrop(this.dragSubTree, event)} 
        onkeydown=${(event: KeyboardEvent) => this.onkeydown(event)} 
      >
        ${this.tree && this.renderTreeNodeView(this.tree)}
      </div>
      `)
      if (this.activeSubTree) {
        let activeNode = find(`#${this.id} [data-id=${this.activeSubTree.id}]`, this.renderTarget);
        activeNode?.focus();
      }
    }
    return result;
  }
  public setActive(subtree: Tree<T>, event?: FocusEvent) {
    this.activeSubTree = subtree;
    this._onfocus && this._onfocus(subtree, event);
  }
  public onkeydown(event: KeyboardEvent) {
    let target = event.target as HTMLElement;
    let key = event.key.toLowerCase();
    let active = find(`#${this.id} :focus`, this.renderTarget!);
    switch (key) {
      case "arrowdown":
        if(event.shiftKey) {
          this.moveActiveDown()
        } else {
          let next = this.findNextVisibleTreeNode(active!);
          next?.focus();
        }
        event.preventDefault();
        break;
      case "arrowup":
        if(event.shiftKey) {
          this.moveActiveUp()
        } else {
          let prev = this.findPrevVisibleTreeNode(active!);
          prev?.focus();
        }
        event.preventDefault();
        break;
      case "arrowright":
        if(event.shiftKey) {
          let parent = this.activeSubTree?.parent;
          let index = parent?.children?.indexOf(this.activeSubTree!) ?? 0;
          let nextNode = parent?.children && parent.children[index + 1];
          if (nextNode && this.isContainer(nextNode) && this.activeSubTree) {
            nextNode.insertAt(0, this.activeSubTree);
          } else {
            this.moveActiveDown();
          }
        } else {
          if(active?.classList.contains("collapsed")) {
            this.activeSubTree && this.setCollapseState(this.activeSubTree, "expanded");
          }
        }
        event.preventDefault();
        break;
      case "arrowleft":
        if(event.shiftKey) {
          let parent = this.activeSubTree?.parent;
          let grandParent = parent?.parent;
          if (parent && grandParent && this.activeSubTree) {
            let index = grandParent.children!.indexOf(parent);
            grandParent.insertAt(index, this.activeSubTree);
          } else {
            this.moveActiveUp();
          }
        } else {
          if(active?.classList.contains("expanded")) {
            this.activeSubTree && this.setCollapseState(this.activeSubTree, "collapsed");
          }
        }
        event.preventDefault();
        break;
      case " ":
        break;
      default:
    }
    if (target.classList?.contains("dropzone")) {

    }
  }
  public ondragstart(subtree: Tree<T>, event: DragEvent): boolean | void {
    let target = event.target as HTMLElement;
    target.classList.add("dragged");
    this.dragElement = target;
    this.dragSubTree = subtree;
    event.stopPropagation();
    return false;
  }
  public ondragend(event: DragEvent): boolean | void {
    this.dragElement?.classList.remove("dragged");
    this.dragElement = undefined;
    this.dragSubTree = undefined;
    event.stopPropagation();
    return false;
  }
  public ondragenter(event: DragEvent): void {
    let target = (event.target! as HTMLElement | null);
    if (!contains(target!, this.dragElement, true)) {
      target = this.findDropZone(target!);
      if (target && target.classList.contains("dropzone") && !target.classList.contains("dropover")) {
        findAll(".dropover", get(this.id)!)
          .forEach((el) => el.classList.remove("dropover"));
        target.classList.add("dropover");
        event.stopPropagation();
      }
    }
    event.preventDefault();
  }
  public ondragover(event: DragEvent): void {
    event.preventDefault();
  }
  public ondragleave(event: DragEvent): void {
    let target = (event.target! as HTMLElement);
    let relatedTarget = (event.relatedTarget! as HTMLElement);
    if (!contains(target!, this.dragElement, true)) {
      if (!relatedTarget
        || relatedTarget.classList.contains("dropzone")
        || !contains(relatedTarget, target)
      ) {
        let dropTarget = this.findDropZone(target!);
        dropTarget?.classList.remove("dropover");
        event.stopPropagation();
      }
    }
  }
  public ondrop(subtree: Tree<T>, event: DragEvent): boolean | void {
    let target = (event.target! as HTMLElement);
    let dropTarget = this.findDropZone(target!);
    if (dropTarget
      && !contains(target, this.dragElement, true)) {
        if(dropTarget.classList.contains("beforenode")) {
          dropTarget = dropTarget.nextElementSibling as HTMLElement;
          let beforeTreeNodeId = dropTarget!.id.substr(dropTarget.id.indexOf("_") + 1);
          let beforeTreeNode = this.tree?.find((node) => node.id === beforeTreeNodeId)!
          let parentTreeNode = beforeTreeNode.parent;
          let beforeIndex = parentTreeNode?.children?.indexOf(beforeTreeNode) ?? 0;
          parentTreeNode?.insertAt(beforeIndex, subtree);
        } else {
            dropTarget = 
              dropTarget.classList.contains("afternode") 
              ? findParent(dropTarget, ".dropzone")!
              : dropTarget;
            let targetSubtreeId = dropTarget.id.substr(dropTarget.id.indexOf("_") + 1);
            if(targetSubtreeId === this.tree?.id) {
              this.tree?.add(subtree);
            } else {
              this.tree?.find((node) => node.id === targetSubtreeId)?.add(subtree);
            }
        }
        this._ondrop && this._ondrop(subtree, event);
    }
    findAll(".dropover", get(this.id)!)
      .forEach((el) => el.classList.remove("dropover"));
  }
  public onclick(subtree: Tree<T>, event: MouseEvent | TouchEvent): boolean | void {
    let result: boolean | void = false;
    event.preventDefault();
    event.stopPropagation();
    let target = event.target! as HTMLElement;
    if(
      !target?.classList?.contains("beforenode") 
      && !target?.classList?.contains("afternode") 
    ) {
      if (event instanceof MouseEvent && (event as MouseEvent).button === 2 && this._onpress) {
        result = this._onpress(subtree, event);
      } else {
        if (is(".innernode,.treenode", target!)) {
          if (this.getCollapseState(subtree) !== "off") {
            if (this.isCollapsed(subtree)) {
              this.setCollapseState(subtree, "expanded")
            } else {
              this.setCollapseState(subtree, "collapsed")
            }
          }
        } else {
          result = this._onclick ? this._onclick(subtree, event) : result;
        }
      }
    }
    return result;
  }
  private findNextVisibleTreeNode(active: HTMLElement): HTMLElement | null {
    let result: HTMLElement | null = null;
    if(is(".haschildren.expanded", active!)) {
      result = find(".treenode", active!);
    } else {
      result = this.findNextVisibleSiblingOrParent(active);
    }
    return result;
  }
  private findNextVisibleSiblingOrParent(active: HTMLElement): HTMLElement | null {
    let result: HTMLElement | null = null;
    let nextSibling = active.nextElementSibling?.nextElementSibling as HTMLElement
    if (nextSibling && nextSibling.classList.contains("treenode")) {
      result = nextSibling;
    } else {
      let parentTreeNode = findParent(active, ".treenode");
      if(parentTreeNode) {
        result = this.findNextVisibleSiblingOrParent(parentTreeNode);
      }
    }
    return result;
  }
  private findPrevVisibleTreeNode(active: HTMLElement): HTMLElement {
    let result = active;
    let prev = active.previousElementSibling?.previousElementSibling as HTMLElement;
    if (prev?.classList.contains("treenode")) {
      if(is(".haschildren.expanded", prev)) {
        let nodes = findAll(".treenode", prev);
        result = nodes[nodes.length - 1];
      } else {
        result = prev;
      }
    } else {
      let parentTreeNode = findParent(active, ".treenode");
      if (parentTreeNode) {
        result = parentTreeNode;
      }
    }
    return result;
  }
  private findDropZone(target: HTMLElement) {
    let result: HTMLElement | null = target.classList.contains("dropzone") 
      ? target as HTMLElement
      : findParent(target!, ".treenode") ?? target;
    while (!result!.classList.contains("dropzone") && result!.nextElementSibling) {
      result = result!.nextElementSibling as HTMLElement ?? result;
    }
    if (!result!.classList.contains("dropzone")) {
        result = findParent(result!, ".dropzone");
    }
    return result;
  }
  private moveActiveUp() {
    let parentSubTree = this.activeSubTree?.parent;
    if (parentSubTree) {
      let index = parentSubTree.children!.indexOf(this.activeSubTree!);
      if (index > 0) {
        parentSubTree.insertAt(index - 1, this.activeSubTree!);
      } else {
        let grandParentSubTree = parentSubTree.parent;
        if (grandParentSubTree) {
          let index = grandParentSubTree.children!.indexOf(parentSubTree!);
          grandParentSubTree.insertAt(index, this.activeSubTree!);
        }
      }
    }
  }
  private moveActiveDown() {
    let parentSubTree = this.activeSubTree?.parent;
    if (parentSubTree) {
      let index = parentSubTree.children!.indexOf(this.activeSubTree!);
      if (index < parentSubTree.children!.length - 1) {
        parentSubTree.insertAt(index + 1, this.activeSubTree!);
      } else {
        let grandParentSubTree = parentSubTree.parent;
        if (grandParentSubTree) {
          let index = grandParentSubTree.children!.indexOf(parentSubTree!);
          grandParentSubTree.insertAt(index + 1, this.activeSubTree!);
        }
      }
    }
  }
  private renderTreeNodeView(subtree: Tree<T>): Tag<HTMLElement> {
    let children = subtree.children;
    let childViews = this.getCollapseState(subtree) !== "collapsed" 
      ? children?.map((c) => {
        return lighterhtml.html`<div class="beforenode dropzone"></div>${this.renderTreeNodeView(c)}`;
      }) as Tag<HTMLElement>[] ?? null
      : null;
    if(childViews) {
      childViews.push(lighterhtml.html`<div class="afternode dropzone"></div>`)
    }
    return lighterhtml.html`${this.renderer(subtree as any, childViews)}`;
  }
  private _ondrop: ((subtree: Tree<T>, event: DragEvent) => boolean | void) | null = null;
  private _onpress: ((subtree: Tree<T>, event: MouseEvent | TouchEvent) => boolean | void) | null = null;
  private _onclick: ((subtree: Tree<T>, event: MouseEvent | TouchEvent) => boolean | void) | null = null;
  private _onfocus: ((subtree: Tree<T>, event?: FocusEvent) => boolean | void) | null = null;
}
