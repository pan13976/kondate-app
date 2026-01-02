export type Recipe = {
    id: string;
    title: string;
    description?: string | null;
    timeMinutes?: number | null;
    tags?: string[] | null;
    mainCategory?: string;
};

export type ApiRecipe = {
    id: string;
    title: string;
    description?: string | null;
    time_minutes?: number | null;
    tags?: string[] | null;
    main_Category?: string;
};