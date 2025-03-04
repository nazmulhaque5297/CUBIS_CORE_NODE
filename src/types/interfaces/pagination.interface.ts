

export interface IPaginationResponse {
    limit: number,
    totalPages: number,
    currentPage: number,
    count: number,
    data: any[]
}