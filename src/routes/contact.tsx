import { Container } from "../components/layout/Container.tsx";

const Contact = () => {
  return (
    <Container>
      <div className="mx-auto flex w-full justify-center px-2 py-6 sm:px-4 sm:py-10">
        <div className="w-full max-w-[768px]">
          <h1 className="mb-6 text-4xl font-bold text-gray-900">Contact</h1>

          <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
            <p className="mb-4 text-lg">
              Duis non mauris quis nulla aliquet molestie. Nulla ullamcorper
              imperdiet sollicitudin. Fusce tristique blandit nisl ut euismod.
              Sed quis ornare eros, vel elementum purus. Donec ac porttitor
              nisl. Vivamus congue nibh sem, feugiat fringilla orci porta
              fringilla. Cras vel eleifend justo. Quisque molestie risus in
              lorem venenatis pellentesque. Sed cursus erat at dignissim
              sollicitudin. Proin a ultrices metus. Suspendisse iaculis eros ut
              pulvinar auctor.
            </p>

            <p className="mb-4 text-lg">
              Whether you have questions about our portal, need technical
              assistance, or want to learn more about our services, we're just
              an email away.
            </p>

            <div className="mt-8 rounded-md bg-sky-50 p-6 text-center">
              <p className="mb-2 text-sm text-sky-900">Mail ons op:</p>
              <a
                href="mailto:contact@mijnoverheid-zakelijk.nl"
                className="inline-block text-2xl font-semibold text-sky-700 hover:text-sky-800 hover:underline"
              >
                contact@mijnoverheid-zakelijk.nl
              </a>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Contact;
