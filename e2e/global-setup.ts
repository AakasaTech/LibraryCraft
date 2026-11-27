import { prepareTestDatabase } from "../tests/setup/test-db";

export default function globalSetup() {
  prepareTestDatabase();
}
