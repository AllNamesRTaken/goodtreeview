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
interface ITableConfig<T> {
  id: string;
  target?: HTMLElement;
  tree?: Tree<T>;
  renderer?: (node: Tree<T>) => Tag<HTMLElement>[];
  onclick?: (subtree: Tree<T>, event: MouseEvent | TouchEvent) => boolean | void;
  onpress?: (subtree: Tree<T>, event: MouseEvent | TouchEvent) => boolean | void;
  onfocus?: (subtree: Tree<T>, event?: FocusEvent) => boolean | void;
  getCollapseState?: (subtree: Tree<T>) => TCollapseState;
  setCollapseState?: (subtree: Tree<T>, value: TCollapseState) => void;
  getColumnData?: (subtree: Tree<T>) => any[];
}

export class TableView<T> {
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
  private getColumnData: (subtree: Tree<T>) => any[] = (subtree: Tree<T>) => (subtree.data as any)?.col as any[] || [];
  private columnRenderer: (subtree: Tree<T>) => Tag<HTMLElement>[] = (subtree) => {
    return this.getColumnData(subtree).map((value) => lighterhtml.html`
        <td class="${["tv-col"].join(" ")}" 
          onclick=${this.isClickable ? this.onclick!.bind(this, subtree) : null}
          oncontextmenu=${this.isPressable ? this.onclick!.bind(this, subtree) : null}
        >${value}</td>`
    );
  }
  private selected: Tree<T> | null = null;

  constructor({ id, target, tree, renderer, onclick, onpress, onfocus, getCollapseState, setCollapseState, getColumnData }: ITableConfig<T>) {
    this.id = id;
    this.renderTarget = target ?? null;
    this.tree = tree ?? null;
    this._onclick = onclick ?? null;
    this._onpress = onpress ?? null;
    this._onfocus = onfocus ?? null;
    this.isClickable = !!onclick;
    this.isPressable = !!onpress;
    this.isDraggable = !!ondrop;
    this.getCollapseState = getCollapseState ?? this.getCollapseState;
    this.setCollapseState = setCollapseState ?? this.setCollapseState;
    this.getColumnData = getColumnData ?? this.getColumnData;
    this.columnRenderer = renderer ?? this.columnRenderer;

    this.renderer =
      ((subtree: Tree<T>, childViews: Tag<HTMLElement>[] | null) => lighterhtml.html`
      <tr data-id=${subtree.id} class=${["tv-row",
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
        tabindex="0" 
        onfocus=${(event: FocusEvent) => this.setActive(subtree, event)}
      >
        ${this.columnRenderer(subtree)}
      </tr>
      ${childViews}
      `);
    this.tree?.on("change", debounce(() => this.render()));
  }

  public render(target?: HTMLElement | null) {
    let result: any;
    this.renderTarget = target ?? this.renderTarget;
    if (this.renderTarget) {

      result = lighterhtml.render(this.renderTarget, () => lighterhtml.html`
      <table id=${this.id} class="tableview"
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
          let next = active?.nextElementSibling as HTMLElement;
          next?.focus();
        event.preventDefault();
        break;
      case "arrowup":
          let prev = active?.previousElementSibling as HTMLElement
          prev?.focus();
        event.preventDefault();
        break;
      case "arrowright":
        if(event.shiftKey) {
          let parent = this.activeSubTree?.parent;
          let index = parent?.children?.indexOf(this.activeSubTree!) ?? 0;
          let nextNode = parent?.children && parent.children[index + 1];
          if (nextNode && this.isContainer(nextNode) && this.activeSubTree) {
            nextNode.insertAt(0, this.activeSubTree);
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
  }
  
  public onclick(subtree: Tree<T>, event: MouseEvent | TouchEvent): boolean | void {
    let result: boolean | void = false;
    event.preventDefault();
    event.stopPropagation();
    let target = event.target! as HTMLElement;
    if (event instanceof MouseEvent && (event as MouseEvent).button === 2 && this._onpress) {
      result = this._onpress(subtree, event);
    } else {
      if (is(".innernode,.tv-row", target!)) {
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
    return result;
  }
  private renderTreeNodeView(subtree: Tree<T>): Tag<HTMLElement> {
    let children = subtree.children;
    let childViews = this.getCollapseState(subtree) !== "collapsed" 
      ? children?.map((c) => {
        return lighterhtml.html`${this.renderTreeNodeView(c)}`;
      }) as Tag<HTMLElement>[] ?? null
      : null;
    return lighterhtml.html`${this.renderer(subtree as any, childViews)}`;
  }
  private _onpress: ((subtree: Tree<T>, event: MouseEvent | TouchEvent) => boolean | void) | null = null;
  private _onclick: ((subtree: Tree<T>, event: MouseEvent | TouchEvent) => boolean | void) | null = null;
  private _onfocus: ((subtree: Tree<T>, event?: FocusEvent) => boolean | void) | null = null;
}
