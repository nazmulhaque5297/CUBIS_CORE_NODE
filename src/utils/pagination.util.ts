import { IPaginationResponse } from "../types/interfaces/pagination.interface";

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

export function emptyPaginationResponse(
  page?: number,
  limit?: number
): IPaginationResponse {
  return {
    limit: limit ?? -1,
    totalPages: -1,
    currentPage: page ?? -1,
    count: -1,
    data: [],
  };
}
