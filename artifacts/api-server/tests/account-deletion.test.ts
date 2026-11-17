import assert from "node:assert/strict";
import { test } from "node:test";
import { PgDialect, type SQL } from "drizzle-orm/pg-core";
import { RequestAccountDeletionBody } from "@workspace/api-zod";
import { accountEmailsTable } from "@workspace/db";
import {
  deleteStoredAccountEmail,
  withStoredAccountEmailDeletion,
} from "../src/lib/accountDeletion";

test("permanent account deletion requires explicit confirmation", () => {
  assert.equal(RequestAccountDeletionBody.safeParse({ confirmed: true }).success, true);
  assert.equal(RequestAccountDeletionBody.safeParse({ confirmed: false }).success, false);
  assert.equal(RequestAccountDeletionBody.safeParse({}).success, false);
});

type AccountDeletionTx = Parameters<
  Parameters<typeof withStoredAccountEmailDeletion>[0]
>[0];

test("permanent deletion removes only the email row owned by that account", async () => {
  let deletedTable: unknown;
  let condition: SQL | undefined;
  const transaction = {
    delete(table: unknown) {
      deletedTable = table;
      return {
        where(whereCondition: SQL) {
          condition = whereCondition;
          return Promise.resolve();
        },
      };
    },
  } as unknown as Parameters<typeof deleteStoredAccountEmail>[0];

  await deleteStoredAccountEmail(transaction, "account-to-delete");

  assert.equal(deletedTable, accountEmailsTable);
  assert.ok(condition);
  const query = new PgDialect().sqlToQuery(condition);
  assert.match(query.sql, /account_emails.*owner_id/);
  assert.deepEqual(query.params, ["account-to-delete"]);
});

test("stored email remains after a failed commit and is removed on retry", async () => {
  const ownerId = "account-to-delete";
  let storedEmail: string | null = "owner@example.com";
  let failNextCommit = true;

  const runTransaction: Parameters<
    typeof withStoredAccountEmailDeletion
  >[0] = async (callback) => {
    let emailDeletionStaged = false;
    const transaction = {
      delete(table: unknown) {
        assert.equal(table, accountEmailsTable);
        return {
          where(condition: SQL) {
            const query = new PgDialect().sqlToQuery(condition);
            assert.deepEqual(query.params, [ownerId]);
            emailDeletionStaged = true;
            return Promise.resolve();
          },
        };
      },
    } as unknown as AccountDeletionTx;

    await callback(transaction);

    if (failNextCommit) {
      failNextCommit = false;
      throw new Error("Simulated failure before transaction commit");
    }

    if (emailDeletionStaged) storedEmail = null;
  };

  await assert.rejects(
    withStoredAccountEmailDeletion(runTransaction, ownerId, async () => {}),
    /Simulated failure before transaction commit/,
  );
  assert.equal(storedEmail, "owner@example.com");

  await withStoredAccountEmailDeletion(
    runTransaction,
    ownerId,
    async () => {},
  );
  assert.equal(storedEmail, null);
});
