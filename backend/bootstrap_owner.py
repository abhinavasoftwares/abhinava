from database import SessionLocal
from services.platform_auth import bootstrap_owner


def main() -> None:
    db = SessionLocal()

    try:
        owner, created = bootstrap_owner(db)

        if created:
            print("Abhinava Owner bootstrap completed.")
            print(f"Email: {owner.email}")
            print(f"Role: {owner.role}")
            print(f"Status: {owner.status}")
            print(f"Identity provider: {owner.identity_provider}")
            print("External subject: not yet bound")
        else:
            print("Abhinava Owner already exists.")
            print(f"Email: {owner.email}")
            print(f"Role: {owner.role}")
            print(f"Status: {owner.status}")
            print("No changes were made.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
