import { ElementRef } from "@angular/core";

export class UIUtils {
  public static getBoxModelDimensions(el: ElementRef | Element | null): {
    contentWidth: number;
    contentHeight: number;
    padding: { top: number; bottom: number; left: number; right: number };
    border: { top: number; bottom: number; left: number; right: number };
    margin: { top: number; bottom: number; left: number; right: number };
    totalWidth: number;
    totalHeight: number;
  } {
    const element = el instanceof ElementRef ? el.nativeElement : el;
    if (!(element instanceof HTMLElement)) {
      return {
        contentWidth: 0,
        contentHeight: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        border: { top: 0, bottom: 0, left: 0, right: 0 },
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
        totalWidth: 0,
        totalHeight: 0,
      };
    }

    const styles = window.getComputedStyle(element);

    const padding = {
      top: parseFloat(styles.paddingTop),
      bottom: parseFloat(styles.paddingBottom),
      left: parseFloat(styles.paddingLeft),
      right: parseFloat(styles.paddingRight),
    };

    const border = {
      top: parseFloat(styles.borderTopWidth),
      bottom: parseFloat(styles.borderBottomWidth),
      left: parseFloat(styles.borderLeftWidth),
      right: parseFloat(styles.borderRightWidth),
    };

    const margin = {
      top: parseFloat(styles.marginTop),
      bottom: parseFloat(styles.marginBottom),
      left: parseFloat(styles.marginLeft),
      right: parseFloat(styles.marginRight),
    };

    const rect = element.getBoundingClientRect();
    const totalWidth = rect.width + margin.left + margin.right;
    const totalHeight = rect.height + margin.top + margin.bottom;

    const contentWidth = rect.width - padding.left - padding.right - border.left - border.right;
    const contentHeight = rect.height - padding.top - padding.bottom - border.top - border.bottom;

    return {
      contentWidth,
      contentHeight,
      padding,
      border,
      margin,
      totalWidth,
      totalHeight,
    };
  }

  public static getIconSizeClass(width: number): string {
    if (width < 640) {
      return "!text-2xl";
    } else if (width < 1024) {
      return "!text-4xl";
    } else {
      return "!text-5xl";
    }
  }
}