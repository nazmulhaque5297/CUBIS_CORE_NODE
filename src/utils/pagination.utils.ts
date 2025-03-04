export class Paginate {
  public total: number;
  public limit: number;
  public pages: number = 0;
  public nextPage: number | null = null;
  public previousPage: number | null = null;
  public currentPage: number;
  public hasNextPage: boolean = false;
  public hasPreviousPage: boolean = false;
  public skip: number = 0;
  public pageValid: boolean = false;

  constructor(total: number, limit: number, currentPage: number) {
    this.total = total;
    this.calLimit(limit);
    this.currentPage = currentPage || 1;
    this.calPages();
    this.currentPageValid();
    this.calNextPage();
    this.calPreviousPage();
    this.calSkip();
  }

  protected calPages() {
    this.pages = Math.ceil(this.total / this.limit);
  }

  protected currentPageValid() {
    this.pageValid =
      this.currentPage <= this.pages && this.currentPage > 0 ? true : false;
  }
  protected calNextPage() {
    if (this.pageValid && this.currentPage < this.pages) {
      this.nextPage = this.currentPage + 1;
      this.hasNextPage = true;
    }
  }
  protected calPreviousPage() {
    if (this.pageValid && this.currentPage > 1) {
      this.previousPage = this.currentPage - 1;
      this.hasPreviousPage = true;
    }
  }
  protected calSkip() {
    if (this.pageValid && this.currentPage <= this.pages) {
      this.skip = this.limit * (this.currentPage - 1);
    } else {
      this.skip = this.total;
    }
  }
  protected calLimit(value: number) {
    this.limit = Math.abs(value) || 10;
  }
}

export function getPaginationDetails(
  pageRequest: number,
  totalRows: number,
  _limit?: number
):
  | {
      skip: number;
      limit: number;
      total: number;
      isFraction: number;
    }
  | undefined {
  const limit: number = _limit || 12;
  let totalPages: number = Math.trunc(totalRows / limit);
  const isFraction: number = totalRows % limit;
  if (isFraction > 0) totalPages += 1;
  if (pageRequest > totalPages || pageRequest < 1) return undefined;
  const skip: number = limit * (pageRequest - 1);
  return {
    skip: skip,
    limit: limit,
    total: totalPages,
    isFraction: isFraction,
  };
}
