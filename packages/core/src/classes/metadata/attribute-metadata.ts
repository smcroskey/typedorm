import {
  AttributeOptionsUniqueType,
  CompositePrimaryKey,
  DYNAMO_ATTRIBUTE_PREFIX,
  EntityTarget,
  PrimaryKey,
  SimplePrimaryKey,
  Table,
  IsPrimaryKey,
  ScalarType,
  AttributeMetadataUnsupportedDefaultValueError,
} from '@typedorm/common';
import {buildPrimaryKeySchema} from '../../helpers/build-primary-key-schema';
import {DynamoEntitySchemaPrimaryKey} from './entity-metadata';
import {
  BaseAttributeMetadataOptions,
  BaseAttributeMetadata,
} from './base-attribute-metadata';
import {isScalarType} from '../../helpers/is-scalar-type';

export interface AttributeMetadataOptions extends BaseAttributeMetadataOptions {
  table: Table;
  entityClass: EntityTarget<any>;
  unique?: AttributeOptionsUniqueType;
  default?: ScalarType | (() => ScalarType);
}

export class AttributeMetadata extends BaseAttributeMetadata {
  readonly unique?: DynamoEntitySchemaPrimaryKey;
  readonly default?: ScalarType;
  readonly table: Table;
  readonly entityClass: EntityTarget<any>;
  constructor(options: AttributeMetadataOptions) {
    const {name, entityClass, unique, table} = options;
    super(options);
    this.entityClass = entityClass;
    this.table = table;
    this.default = this.getDefaultValue(name, options.default);

    if (unique) {
      this.unique = this.buildUniqueAttributesPrimaryKey(unique);
    }
  }

  private getDefaultValue(
    attrName: string,
    defaultValue: AttributeMetadataOptions['default']
  ) {
    let scalarDefaultValue: ScalarType | undefined = undefined;
    if (!defaultValue) {
      return;
    }

    // if a factory function was provided get returned value
    if (typeof defaultValue === 'function') {
      scalarDefaultValue = defaultValue();
    } else {
      scalarDefaultValue = defaultValue as ScalarType;
    }

    if (isScalarType(scalarDefaultValue)) {
      return scalarDefaultValue;
    }

    throw new AttributeMetadataUnsupportedDefaultValueError(
      attrName,
      defaultValue
    );
  }

  private buildUniqueAttributesPrimaryKey(unique: AttributeOptionsUniqueType) {
    if (IsPrimaryKey(unique)) {
      return buildPrimaryKeySchema({
        table: this.table,
        primaryKey: unique,
        attributes: {
          [this.name]: this.type,
        },
      });
    } else {
      return this.autoGeneratedPrimaryKeySchema();
    }
  }

  private autoGeneratedPrimaryKeySchema() {
    const primaryKey = {} as PrimaryKey;

    const uniqueKeyValue = `${DYNAMO_ATTRIBUTE_PREFIX}_${this.entityClass.name.toUpperCase()}.${this.name.toUpperCase()}#{{${
      this.name
    }}}`;

    if (this.table.usesCompositeKey()) {
      (primaryKey as CompositePrimaryKey).partitionKey = uniqueKeyValue;
      (primaryKey as CompositePrimaryKey).sortKey = uniqueKeyValue;
    } else {
      (primaryKey as SimplePrimaryKey).partitionKey = uniqueKeyValue;
    }

    return buildPrimaryKeySchema({
      table: this.table,
      primaryKey,
      attributes: {
        [this.name]: this.type,
      },
    });
  }
}
