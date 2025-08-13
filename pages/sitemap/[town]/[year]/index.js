export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/sitemap",
      permanent: false,
    },
  };
}

export default function Year() {
  return null;
}
