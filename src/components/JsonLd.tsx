// JSON-LD 結構化資料組件
// 用於 SEO，幫助搜尋引擎理解頁面內容

type CourseJsonLdProps = {
  name: string;
  description?: string;
  instructor?: string;
  provider: string;
  url: string;
  credits?: number | null;
};

export function CourseJsonLd({
  name,
  description,
  instructor,
  provider,
  url,
  credits,
}: CourseJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description: description || `${name} - ${provider} 課程`,
    provider: {
      "@type": "Organization",
      name: provider,
      sameAs: "https://www.nkust.edu.tw/",
    },
    ...(instructor && {
      instructor: {
        "@type": "Person",
        name: instructor,
      },
    }),
    ...(credits && {
      numberOfCredits: credits,
    }),
    url,
    inLanguage: "zh-TW",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type WebsiteJsonLdProps = {
  name: string;
  description: string;
  url: string;
};

export function WebsiteJsonLd({ name, description, url }: WebsiteJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    description,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/courses?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "zh-TW",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type BreadcrumbJsonLdProps = {
  items: Array<{
    name: string;
    url: string;
  }>;
};

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type OrganizationJsonLdProps = {
  name: string;
  url: string;
  logo?: string;
  description?: string;
};

export function OrganizationJsonLd({ name, url, logo, description }: OrganizationJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(logo && { logo }),
    ...(description && { description }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
